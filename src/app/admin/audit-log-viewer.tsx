"use client";

import { useState, useEffect, useCallback } from 'react';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight,
  ArrowUpDown, ArrowUp, ArrowDown, Search, X,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditLog {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  orgId: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface AuditLogResponse {
  data: AuditLog[];
  pagination: Pagination;
}

type SortField = 'createdAt' | 'action' | 'entity' | 'userId';
type SortDir = 'asc' | 'desc';

// ─── Constants ──────────────────────────────────────────────────────────────

const ACTIONS = [
  'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'ROLE_CHANGE', 'ASSIGN', 'UNASSIGN',
] as const;

const ENTITIES = [
  'Animal', 'Record', 'Species', 'ReleaseChecklist',
  'HygieneLog', 'IncidentReport', 'Asset', 'CarerTraining',
  'CarerProfile', 'OrgMember', 'SpeciesGroup', 'CoordinatorSpeciesAssignment',
] as const;

const ACTION_BADGE_VARIANT: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success'> = {
  CREATE: 'success',
  UPDATE: 'secondary',
  DELETE: 'destructive',
  LOGIN: 'default',
  ROLE_CHANGE: 'warning',
  ASSIGN: 'default',
  UNASSIGN: 'outline',
};

const PAGE_SIZE_OPTIONS = [10, 25, 50];

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditLogViewer() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 25, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');
  const [appliedUserSearch, setAppliedUserSearch] = useState('');

  // Sorting
  const [sortBy, setSortBy] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  // Page size
  const [pageSize, setPageSize] = useState(25);

  const fetchLogs = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('pageSize', String(pageSize));
      params.set('sortBy', sortBy);
      params.set('sortDir', sortDir);
      if (actionFilter !== 'all') params.set('action', actionFilter);
      if (entityFilter !== 'all') params.set('entity', entityFilter);
      if (appliedUserSearch) params.set('userId', appliedUserSearch);

      const res = await fetch(`/api/audit-logs?${params}`);
      if (!res.ok) throw new Error(await res.text());
      const json: AuditLogResponse = await res.json();
      setLogs(json.data);
      setPagination(json.pagination);
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [actionFilter, entityFilter, appliedUserSearch, sortBy, sortDir, pageSize]);

  // Refetch when filters/sort/page change
  useEffect(() => {
    fetchLogs(1);
  }, [actionFilter, entityFilter, appliedUserSearch, sortBy, sortDir, pageSize]);

  const goToPage = (page: number) => {
    if (page < 1 || page > pagination.totalPages) return;
    fetchLogs(page);
  };

  const toggleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const clearFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setUserSearch('');
    setAppliedUserSearch('');
  };

  const hasActiveFilters = actionFilter !== 'all' || entityFilter !== 'all' || appliedUserSearch !== '';

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="ml-1 h-3 w-3 opacity-40" />;
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 h-3 w-3" />
      : <ArrowDown className="ml-1 h-3 w-3" />;
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-AU', {
      timeZone: 'Australia/Sydney',
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatMetadata = (meta: Record<string, unknown> | null) => {
    if (!meta) return '—';
    const entries = Object.entries(meta);
    if (entries.length === 0) return '—';
    return entries.map(([k, v]) => {
      const val = Array.isArray(v) ? v.join(', ') : String(v);
      return `${k}: ${val}`;
    }).join('; ');
  };

  return (
    <div className="space-y-4">
      {/* Filters row */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
        <div className="w-full sm:w-[180px]">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map(a => (
                <SelectItem key={a} value={a}>{a}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="w-full sm:w-[200px]">
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by entity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITIES.map(e => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative w-full sm:w-[240px]">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter by User ID..."
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setAppliedUserSearch(userSearch); }}
            className="pl-8 pr-8"
          />
          {userSearch && (
            <button
              onClick={() => { setUserSearch(''); setAppliedUserSearch(''); }}
              className="absolute right-2 top-2.5"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>

        {userSearch && userSearch !== appliedUserSearch && (
          <Button size="sm" variant="outline" onClick={() => setAppliedUserSearch(userSearch)}>
            Apply
          </Button>
        )}

        {hasActiveFilters && (
          <Button size="sm" variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <button className="flex items-center font-medium" onClick={() => toggleSort('createdAt')}>
                  When (AEST)
                  <SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center font-medium" onClick={() => toggleSort('userId')}>
                  User
                  <SortIcon field="userId" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center font-medium" onClick={() => toggleSort('action')}>
                  Action
                  <SortIcon field="action" />
                </button>
              </TableHead>
              <TableHead>
                <button className="flex items-center font-medium" onClick={() => toggleSort('entity')}>
                  Entity
                  <SortIcon field="entity" />
                </button>
              </TableHead>
              <TableHead>Entity ID</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading audit logs...
                </TableCell>
              </TableRow>
            ) : logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No audit logs found{hasActiveFilters ? ' matching your filters.' : '.'}
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-sm">
                    {formatDate(log.createdAt)}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={log.userEmail || log.userId}>
                    {log.userName || log.userEmail ? (
                      <div>
                        {log.userName && <div className="text-sm font-medium">{log.userName}</div>}
                        <div className="text-xs text-muted-foreground">{log.userEmail || log.userId}</div>
                      </div>
                    ) : (
                      <span className="font-mono text-xs">{log.userId}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={ACTION_BADGE_VARIANT[log.action] || 'outline'}>
                      {log.action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{log.entity}</TableCell>
                  <TableCell className="font-mono text-xs max-w-[120px] truncate" title={log.entityId || '—'}>
                    {log.entityId || '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[250px] truncate" title={formatMetadata(log.metadata)}>
                    {formatMetadata(log.metadata)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
            <SelectTrigger className="w-[70px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="ml-2">
            {pagination.total === 0
              ? 'No results'
              : `${(pagination.page - 1) * pagination.pageSize + 1}–${Math.min(pagination.page * pagination.pageSize, pagination.total)} of ${pagination.total}`}
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(1)}>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            disabled={pagination.page <= 1}
            onClick={() => goToPage(pagination.page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-3 text-sm">
            Page {pagination.page} of {pagination.totalPages || 1}
          </span>
          <Button variant="outline" size="icon" className="h-8 w-8"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goToPage(pagination.totalPages)}>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
