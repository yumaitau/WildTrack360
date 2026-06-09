'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowUpDown, ChevronDown, Download, Plus, Search,
  Settings2, Upload, Users,
} from 'lucide-react';
import {
  ColumnDef, ColumnFiltersState, SortingState, VisibilityState,
  flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useReactTable,
} from '@tanstack/react-table';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MemberDialog, type MemberFormValue } from './member-dialog';
import { ImportDialog } from './import-dialog';
import { TiersAdmin } from './tiers-admin';

interface Member {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  memberNumber: string | null;
  status: 'ACTIVE' | 'LAPSED' | 'CANCELLED' | 'DECEASED';
  joinedAt: string;
  clerkUserId: string | null;
  clerkInvitationId: string | null;
  customFieldsJson?: Record<string, unknown> | null;
}

function portalState(m: Member): { label: string; className: string } {
  if (m.clerkUserId) return { label: 'Active', className: 'bg-emerald-500/10 text-emerald-700 border-emerald-200' };
  if (m.clerkInvitationId) return { label: 'Invited', className: 'bg-amber-500/10 text-amber-700 border-amber-200' };
  return { label: '—', className: 'bg-muted text-muted-foreground' };
}

const STATUS_COLORS: Record<Member['status'], string> = {
  ACTIVE: 'bg-emerald-500/10 text-emerald-700 border-emerald-200',
  LAPSED: 'bg-amber-500/10 text-amber-700 border-amber-200',
  CANCELLED: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
  DECEASED: 'bg-zinc-500/10 text-zinc-600 border-zinc-200',
};

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      msg = body.error || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export function MembersAdmin() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);

  const [sorting, setSorting] = useState<SortingState>([{ id: 'lastName', desc: false }]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<Member[]>(`/api/members`);
      setMembers(data);
    } catch (err) {
      toast.error(`Failed to load members: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSubmit(values: MemberFormValue) {
    try {
      if (editing) {
        await apiJson(`/api/members/${editing.id}`, {
          method: 'PATCH',
          body: JSON.stringify(values),
        });
        toast.success('Member updated');
      } else {
        await apiJson('/api/members', {
          method: 'POST',
          body: JSON.stringify(values),
        });
        toast.success('Member created');
      }
      setDialogOpen(false);
      setEditing(null);
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleArchive(member: Member) {
    if (!confirm(`Archive ${member.firstName} ${member.lastName}?`)) return;
    try {
      await apiJson(`/api/members/${member.id}`, { method: 'DELETE' });
      toast.success('Member archived');
      load();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleInvite(member: Member) {
    try {
      await apiJson(`/api/members/${member.id}/invite`, { method: 'POST' });
      toast.success(`Portal invitation sent to ${member.email}`);
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function handleEdit(m: Member) {
    try {
      const full = await apiJson<Member>(`/api/members/${m.id}`);
      setEditing(full);
      setDialogOpen(true);
    } catch (err) {
      toast.error(`Failed to load member: ${(err as Error).message}`);
    }
  }

  const columns = useMemo<ColumnDef<Member>[]>(() => [
    {
      id: 'name',
      accessorFn: (m) => `${m.lastName}, ${m.firstName}`,
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Name <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.firstName} {row.original.lastName}</span>
      ),
    },
    {
      accessorKey: 'email',
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Email <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
    },
    {
      accessorKey: 'memberNumber',
      header: 'Member #',
      cell: ({ row }) => row.original.memberNumber ?? '—',
    },
    {
      id: 'location',
      header: 'Location',
      accessorFn: (m) => [m.suburb, m.state, m.postcode].filter(Boolean).join(' '),
      cell: ({ getValue }) => (getValue() as string) || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant="outline" className={STATUS_COLORS[row.original.status]}>
          {row.original.status}
        </Badge>
      ),
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true;
        return row.getValue(id) === value;
      },
    },
    {
      id: 'portal',
      header: 'Portal',
      accessorFn: (m) => (m.clerkUserId ? 'Active' : m.clerkInvitationId ? 'Invited' : '—'),
      cell: ({ row }) => {
        const s = portalState(row.original);
        return <Badge variant="outline" className={s.className}>{s.label}</Badge>;
      },
      filterFn: (row, id, value) => {
        if (!value || value === 'all') return true;
        return row.getValue(id) === value;
      },
    },
    {
      accessorKey: 'joinedAt',
      header: ({ column }) => (
        <Button variant="ghost" className="-ml-3 h-8"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
          Joined <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const d = new Date(row.original.joinedAt);
        return Number.isFinite(d.getTime()) ? d.toLocaleDateString('en-AU') : '—';
      },
      sortingFn: (a, b) => {
        const at = new Date(a.original.joinedAt).getTime();
        const bt = new Date(b.original.joinedAt).getTime();
        const av = Number.isFinite(at) ? at : -Infinity;
        const bv = Number.isFinite(bt) ? bt : -Infinity;
        return av - bv;
      },
    },
    {
      id: 'actions',
      enableHiding: false,
      header: () => <div className="text-right">Actions</div>,
      cell: ({ row }) => (
        <div className="text-right space-x-2">
          <Button variant="outline" size="sm" onClick={() => handleEdit(row.original)}>Edit</Button>
          <Button variant="outline" size="sm" onClick={() => handleInvite(row.original)}>Invite</Button>
          <Button variant="ghost" size="sm" onClick={() => handleArchive(row.original)}>Archive</Button>
        </div>
      ),
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ], []);

  const table = useReactTable({
    data: members,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _id, value) => {
      const search = String(value ?? '').trim().toLowerCase();
      if (!search) return true;
      const m = row.original;
      return [m.firstName, m.lastName, m.email, m.memberNumber, m.suburb, m.state, m.postcode]
        .filter(Boolean)
        .some((f) => String(f).toLowerCase().includes(search));
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 25 } },
    state: { sorting, columnFilters, columnVisibility, globalFilter },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card shadow-sm">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary flex items-center gap-2">
            <Users className="h-6 w-6" /> Members
          </h1>
          <Link href="/admin">
            <Button variant="ghost">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Admin
            </Button>
          </Link>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        <Tabs defaultValue="members">
          <TabsList>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="tiers">Membership Tiers</TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Member roster</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Wildlife organisation supporters, donors, and paying members.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href="/admin/members/fields">
                    <Button variant="outline">
                      <Settings2 className="h-4 w-4 mr-2" /> Custom fields
                    </Button>
                  </Link>
                  <Button variant="outline" onClick={() => setImportOpen(true)}>
                    <Upload className="h-4 w-4 mr-2" /> Import CSV
                  </Button>
                  {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                  <a href="/api/members/export">
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" /> Export CSV
                    </Button>
                  </a>
                  <Button onClick={() => { setEditing(null); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" /> New member
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search name, email, member number, location"
                      className="pl-9"
                      value={globalFilter}
                      onChange={(e) => setGlobalFilter(e.target.value)}
                    />
                  </div>
                  <Select
                    value={(table.getColumn('status')?.getFilterValue() as string) ?? 'all'}
                    onValueChange={(v) => {
                      table.getColumn('status')?.setFilterValue(v === 'all' ? undefined : v);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="LAPSED">Lapsed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="DECEASED">Deceased</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={(table.getColumn('portal')?.getFilterValue() as string) ?? 'all'}
                    onValueChange={(v) => {
                      table.getColumn('portal')?.setFilterValue(v === 'all' ? undefined : v);
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44">
                      <SelectValue placeholder="Portal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All portal</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Invited">Invited</SelectItem>
                      <SelectItem value="—">Not invited</SelectItem>
                    </SelectContent>
                  </Select>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Columns <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {table.getAllColumns()
                        .filter((c) => c.getCanHide())
                        .map((c) => (
                          <DropdownMenuCheckboxItem
                            key={c.id}
                            className="capitalize"
                            checked={c.getIsVisible()}
                            onCheckedChange={(v) => c.toggleVisibility(!!v)}
                          >
                            {c.id}
                          </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      {table.getHeaderGroups().map((hg) => (
                        <TableRow key={hg.id}>
                          {hg.headers.map((h) => (
                            <TableHead key={h.id}>
                              {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="text-center text-muted-foreground h-24">
                            Loading…
                          </TableCell>
                        </TableRow>
                      ) : table.getRowModel().rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={columns.length} className="text-center text-muted-foreground h-24">
                            No members match your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        table.getRowModel().rows.map((row) => (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-3 justify-between">
                  <div className="text-sm text-muted-foreground">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount() || 1} ·{' '}
                    {table.getFilteredRowModel().rows.length} result(s)
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(table.getState().pagination.pageSize)}
                      onValueChange={(v) => table.setPageSize(Number(v))}
                    >
                      <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[10, 25, 50, 100, 250].map((n) => (
                          <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm"
                      onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
                      Previous
                    </Button>
                    <Button variant="outline" size="sm"
                      onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tiers">
            <TiersAdmin />
          </TabsContent>
        </Tabs>

        <MemberDialog
          open={dialogOpen}
          onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditing(null); }}
          initial={editing}
          onSubmit={handleSubmit}
        />
        <ImportDialog
          open={importOpen}
          onOpenChange={setImportOpen}
          onImported={load}
        />
      </main>
    </div>
  );
}
