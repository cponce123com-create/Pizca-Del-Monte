'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, FileText, Download, Mail, AlertCircle, CheckCircle, XCircle, Clock, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Complaint = {
  id: string;
  entryNumber: string;
  documentType: string;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  type: string;
  subject: string;
  detail: string;
  requestedAmount: string | null;
  attachmentUrls: string[];
  status: string;
  response: string | null;
  respondedAt: string | null;
  respondedBy: string | null;
  resolutionCode: string | null;
  followUpRequired: boolean;
  followUpDate: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
};

export default function ReclamosPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; status?: string; type?: string; dateFrom?: string; dateTo?: string }> }) {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [responseForm, setResponseForm] = useState({ response: '', status: 'EN_TRAMITE', resolutionCode: '', followUpRequired: false, followUpDate: '' });

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const status = params.status || '';
  const type = params.type || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', page.toString());
      searchParams.set('limit', '20');
      if (search) searchParams.set('search', search);
      if (status) searchParams.set('status', status);
      if (type) searchParams.set('type', type);
      if (dateFrom) searchParams.set('dateFrom', dateFrom);
      if (dateTo) searchParams.set('dateTo', dateTo);
      searchParams.set('sort', sortConfig.key);
      searchParams.set('order', sortConfig.direction);

      const res = await fetch(`/api/admin/reclamos?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) return <ChevronDown className="h-4 w-4 text-muted-foreground" />;
    return sortConfig.direction === 'asc' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const formatStatus = (status: string) => {
    const statuses: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      REGISTRADO: { label: 'Registrado', icon: FileText, variant: 'outline' },
      EN_TRAMITE: { label: 'En Trámite', icon: Clock, variant: 'default' },
      RESUELTO: { label: 'Resuelto', icon: CheckCircle, variant: 'success' },
      ARCHIVADO: { label: 'Archivado', icon: Archive, variant: 'secondary' },
      RECHAZADO: { label: 'Rechazado', icon: XCircle, variant: 'destructive' },
    };
    return statuses[status] || { label: status, icon: FileText, variant: 'outline' };
  };

  const formatType = (type: string) => {
    return type === 'RECLAMO' ? 'Reclamo' : type === 'QUEJA' ? 'Queja' : type;
  };

  const openResponseDialog = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
    setResponseForm({
      response: complaint.response || '',
      status: complaint.status,
      resolutionCode: complaint.resolutionCode || '',
      followUpRequired: complaint.followUpRequired,
      followUpDate: complaint.followUpDate ? complaint.followUpDate.slice(0, 16) : '',
    });
    setDialogOpen(true);
  };

  const handleResponseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;

    try {
      const formData = new FormData();
      formData.append('id', selectedComplaint.id);
      Object.entries(responseForm).forEach(([key, value]) => {
        if (value !== '' && value !== null && value !== undefined) formData.append(key, value);
      });

      const res = await fetch('/admin/reclamos/respond', { method: 'POST', body: formData });
      if (res.ok) {
        setDialogOpen(false);
        window.location.reload();
      } else {
        alert('Error al responder');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleExport = async () => {
    const res = await fetch(`/api/admin/reclamos/export?dateFrom=${dateFrom || new Date(Date.now() - 30*24*60*60*1000).toISOString().slice(0,10)}&dateTo=${dateTo || new Date().toISOString().slice(0,10)}`);
    if (res.ok) {
      const data = await res.json();
      const csv = [
        ['Número', 'Tipo', 'Documento', 'Nombre', 'Email', 'Asunto', 'Estado', 'Fecha', 'Monto Solicitado', 'Respondido'].join(','),
        ...data.map((c: Complaint) => [
          c.entryNumber, formatType(c.type), `${c.documentType} ${c.documentNumber}`,
          `${c.firstName} ${c.lastName}`, c.email, `"${c.subject.replace(/"/g, '""')}"`,
          c.status, format(new Date(c.createdAt), 'dd/MM/yyyy', { locale: es }),
          c.requestedAmount || '', c.respondedAt ? format(new Date(c.respondedAt), 'dd/MM/yyyy', { locale: es }) : 'Pendiente'
        ].join(','))
      ].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `reclamos_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <AlertCircle className="h-8 w-8" />
            Libro de Reclamaciones (INDECOPI)
          </h1>
          <p className="text-muted-foreground">Gestiona reclamos y quejas de consumidores según normativa peruana</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{complaints.filter(c => c.status === 'REGISTRADO').length}</div><div className="text-sm text-muted-foreground">Registrados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-primary">{complaints.filter(c => c.status === 'EN_TRAMITE').length}</div><div className="text-sm text-muted-foreground">En Trámite</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{complaints.filter(c => c.status === 'RESUELTO').length}</div><div className="text-sm text-muted-foreground">Resueltos</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{complaints.filter(c => c.status === 'RECHAZADO').length}</div><div className="text-sm text-muted-foreground">Rechazados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{complaints.filter(c => c.followUpRequired && c.status !== 'RESUELTO').length}</div><div className="text-sm text-muted-foreground">Requieren Seguimiento</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número, documento, nombre, asunto..."
            value={search}
            onChange={(e) => { const p = new URLSearchParams(window.location.search); p.set('search', e.target.value); p.set('page', '1'); window.location.search = p.toString(); }}
            className="pl-10"
          />
        </div>
        <Select value={status} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('status', v); else p.delete('status'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="Estado" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="REGISTRADO">Registrado</SelectItem>
            <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
            <SelectItem value="RESUELTO">Resuelto</SelectItem>
            <SelectItem value="ARCHIVADO">Archivado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('type', v); else p.delete('type'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="RECLAMO">Reclamo</SelectItem>
            <SelectItem value="QUEJA">Queja</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateFrom', e.target.value); else p.delete('dateFrom'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Desde" className="w-[160px]" />
        <Input type="date" value={dateTo} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateTo', e.target.value); else p.delete('dateTo'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Hasta" className="w-[160px]" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('entryNumber')}>
                <div className="flex items-center gap-2">Número <getSortIcon key="entryNumber" /></div>
              </TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('documentNumber')}>
                <div className="flex items-center gap-2">Documento <getSortIcon key="documentNumber" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('firstName')}>
                <div className="flex items-center gap-2">Consumidor <getSortIcon key="firstName" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('subject')}>
                <div className="flex items-center gap-2">Asunto <getSortIcon key="subject" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">Fecha <getSortIcon key="createdAt" /></div>
              </TableHead>
              <TableHead>Monto</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Respondido</TableHead>
              <TableHead className="w-[100px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : complaints.length === 0 ? (
              <TableRow><TableCell colSpan={10} className="text-center py-8 text-muted-foreground">No se encontraron reclamos</TableCell></TableRow>
            ) : (
              complaints.map((c) => {
                const statusInfo = formatStatus(c.status);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono font-medium">{c.entryNumber}</TableCell>
                    <TableCell><Badge variant="outline">{formatType(c.type)}</Badge></TableCell>
                    <TableCell className="font-mono">{c.documentType} {c.documentNumber}</TableCell>
                    <TableCell>
                      <p className="font-medium">{c.firstName} {c.lastName}</p>
                      <p className="text-xs text-muted-foreground">{c.email}</p>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{c.subject}</TableCell>
                    <TableCell>{format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                    <TableCell className="font-mono">{c.requestedAmount ? new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(Number(c.requestedAmount)) : '—'}</TableCell>
                    <TableCell><Badge variant={statusInfo.variant}><statusInfo.icon className="h-3 w-3 mr-1" /> {statusInfo.label}</Badge></TableCell>
                    <TableCell>
                      {c.respondedAt ? (
                        <span className="text-sm text-green-600">{format(new Date(c.respondedAt), 'dd/MM/yyyy', { locale: es })}</span>
                      ) : (
                        <span className="text-muted-foreground">Pendiente</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Dialog open={dialogOpen && selectedComplaint?.id === c.id} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={() => openResponseDialog(c)}>
                            <FileText className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Responder a {c.entryNumber}</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleResponseSubmit} className="space-y-4">
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p><strong>Consumidor:</strong> {c.firstName} {c.lastName} ({c.documentType} {c.documentNumber})</p>
                              <p><strong>Email:</strong> {c.email}</p>
                              <p><strong>Tipo:</strong> {formatType(c.type)}</p>
                              <p><strong>Asunto:</strong> {c.subject}</p>
                            </div>
                            <div>
                              <Label>Nuevo Estado</Label>
                              <Select value={responseForm.status} onValueChange={v => setResponseForm(prev => ({ ...prev, status: v }))}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="EN_TRAMITE">En Trámite</SelectItem>
                                  <SelectItem value="RESUELTO">Resuelto</SelectItem>
                                  <SelectItem value="ARCHIVADO">Archivado</SelectItem>
                                  <SelectItem value="RECHAZADO">Rechazado</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Respuesta *</Label>
                              <Textarea value={responseForm.response} onChange={e => setResponseForm(prev => ({ ...prev, response: e.target.value }))} rows={6} required placeholder="Escriba la respuesta al consumidor..." />
                            </div>
                            <div className="grid gap-4 md:grid-cols-2">
                              <div>
                                <Label>Código de Resolución (opcional)</Label>
                                <Input value={responseForm.resolutionCode} onChange={e => setResponseForm(prev => ({ ...prev, resolutionCode: e.target.value }))} placeholder="Ej: R-2024-001" />
                              </div>
                              <div className="flex items-center gap-2">
                                <input type="checkbox" id="followUp" checked={responseForm.followUpRequired} onChange={e => setResponseForm(prev => ({ ...prev, followUpRequired: e.target.checked }))} className="h-4 w-4" />
                                <Label htmlFor="followUp">Requiere Seguimiento</Label>
                              </div>
                            </div>
                            {responseForm.followUpRequired && (
                              <div>
                                <Label>Fecha de Seguimiento</Label>
                                <Input type="datetime-local" value={responseForm.followUpDate} onChange={e => setResponseForm(prev => ({ ...prev, followUpDate: e.target.value }))} />
                              </div>
                            )}
                            <DialogFooter>
                              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                              <Button type="submit">Guardar Respuesta</Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} reclamos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page - 1).toString()); window.location.search = p.toString(); }}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page + 1).toString()); window.location.search = p.toString(); }}>Siguiente</Button>
          </div>
        </div>
      )}
    </div>
  );
}