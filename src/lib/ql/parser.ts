// Recursive-descent parser for the safe query language.
//
// Grammar (keywords are case-insensitive):
//   query    := "from" IDENT clause*
//   clause   := where | since | until | groupBy | select
//   where    := "where" cond ("and" cond)*
//   cond     := IDENT op value
//   op       := "=" | "!=" | "in"
//   value    := TOKEN                              (for = / !=)
//             | "(" TOKEN ("," TOKEN)* ")"         (for in)
//   since    := "since" DATE
//   until    := "until" DATE
//   groupBy  := "group" "by" IDENT
//   select   := "select" ("count" | "sum" IDENT | "avg" IDENT)
//
// The parser only produces a structural AST — it does not consult the allowlist.
// Semantic checks (known sources/fields, caps) live in validate.ts.

import type { ParseResult, QlOperator, QlFilter, QlMetric, QueryAST } from './types';

interface Token {
  value: string;
  /** 1-based word index for friendly error messages. */
  index: number;
}

const TOKEN_RE = /!=|=|\(|\)|,|[^\s(),=!]+/g;

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = TOKEN_RE.exec(input)) !== null) {
    tokens.push({ value: match[0], index: ++i });
  }
  return tokens;
}

class Parser {
  private pos = 0;
  constructor(private readonly tokens: Token[]) {}

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private next(): Token | undefined {
    return this.tokens[this.pos++];
  }

  private atEnd(): boolean {
    return this.pos >= this.tokens.length;
  }

  /** Consume a non-keyword identifier/value token. */
  private ident(what: string): string {
    const tok = this.next();
    if (!tok) throw new Error(`Expected ${what} but reached the end of the query.`);
    if (['(', ')', ',', '=', '!='].includes(tok.value)) {
      throw new Error(`Expected ${what} but found "${tok.value}".`);
    }
    return tok.value;
  }

  private expectWord(word: string): void {
    const tok = this.next();
    if (!tok || tok.value.toLowerCase() !== word) {
      throw new Error(`Expected "${word}" but found "${tok?.value ?? 'end of query'}".`);
    }
  }

  private parseOperator(): QlOperator {
    const tok = this.next();
    if (!tok) throw new Error('Expected an operator (=, !=, or in).');
    const v = tok.value.toLowerCase();
    if (tok.value === '=' || tok.value === '!=') return tok.value;
    if (v === 'in') return 'in';
    throw new Error(`Expected an operator (=, !=, or in) but found "${tok.value}".`);
  }

  private parseValueList(): string[] {
    // assumes the "in" operator was just consumed; expect "( v , v , ... )"
    this.expectWord('(');
    const values: string[] = [];
    if (this.peek()?.value === ')') {
      throw new Error('Empty value list for "in".');
    }
    for (;;) {
      values.push(this.ident('a value'));
      const sep = this.next();
      if (!sep) throw new Error('Unterminated value list — missing ")".');
      if (sep.value === ')') break;
      if (sep.value !== ',') throw new Error(`Expected "," or ")" but found "${sep.value}".`);
    }
    return values;
  }

  private parseWhere(): QlFilter[] {
    const filters: QlFilter[] = [];
    for (;;) {
      const field = this.ident('a field name');
      const op = this.parseOperator();
      const values = op === 'in' ? this.parseValueList() : [this.ident('a value')];
      filters.push({ field, op, values });
      if (this.peek()?.value.toLowerCase() === 'and') {
        this.next();
        continue;
      }
      break;
    }
    return filters;
  }

  private parseMetric(): QlMetric {
    const tok = this.next();
    if (!tok) throw new Error('Expected "count", "sum", or "avg" after "select".');
    const kind = tok.value.toLowerCase();
    if (kind === 'count') return { kind: 'count' };
    if (kind === 'sum') return { kind: 'sum', field: this.ident('a numeric field') };
    if (kind === 'avg') return { kind: 'avg', field: this.ident('a numeric field') };
    throw new Error(`Expected "count", "sum", or "avg" but found "${tok.value}".`);
  }

  parse(): QueryAST {
    if (this.atEnd()) throw new Error('Query is empty. Start with "from <source>".');
    this.expectWord('from');
    const source = this.ident('a source name');

    const ast: QueryAST = { source, filters: [], metric: { kind: 'count' } };

    while (!this.atEnd()) {
      const kw = this.peek()!.value.toLowerCase();
      switch (kw) {
        case 'where':
          this.next();
          ast.filters = this.parseWhere();
          break;
        case 'since':
          this.next();
          ast.since = this.ident('a date (YYYY-MM-DD)');
          break;
        case 'until':
          this.next();
          ast.until = this.ident('a date (YYYY-MM-DD)');
          break;
        case 'group':
          this.next();
          this.expectWord('by');
          ast.groupBy = this.ident('a field name');
          break;
        case 'select':
          this.next();
          ast.metric = this.parseMetric();
          break;
        default:
          throw new Error(`Unexpected "${this.peek()!.value}". Expected a clause keyword.`);
      }
    }

    return ast;
  }
}

export function parseQuery(input: string): ParseResult {
  try {
    const tokens = tokenize(input ?? '');
    const ast = new Parser(tokens).parse();
    return { ast, error: null };
  } catch (e) {
    return { ast: null, error: e instanceof Error ? e.message : 'Failed to parse query.' };
  }
}
