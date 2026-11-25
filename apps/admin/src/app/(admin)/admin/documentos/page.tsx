'use client';

import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, FileText, Download, Eye, RefreshCw, AlertCircle, CheckCircle, XCircle, Clock, Archive, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

type Document = {
  id: string;
  type: string;
  series: string;
  number: number;
  sunatId: string | null;
  sunatStatus: string | null;
  sunatResponse: any;
  pdfUrl: string | null;
  xmlContent: string | null;
  cdrContent: string | null;
  createdAt: string;
  signedAt: string | null;
  sentAt: string | null;
  voidedAt: string | null;
  voidReason: string | null;
  order: {
    id: string;
    orderNumber: string;
    customerName: string | null;
    customerDocument: string | null;
  } | null;
};

export default function DocumentosPage({ searchParams }: { searchParams: Promise<{ page?: string; search?: string; type?: string; status?: string; dateFrom?: string; dateTo?: string }> }) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [voidForm, setVoidForm] = useState({ reason: '' });
  const [isVoiding, setIsVoiding] = useState(false);

  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search || '';
  const type = params.type || '';
  const status = params.status || '';
  const dateFrom = params.dateFrom || '';
  const dateTo = params.dateTo || '';

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const searchParams = new URLSearchParams();
      searchParams.set('page', page.toString());
      searchParams.set('limit', '20');
      if (search) searchParams.set('search', search);
      if (type) searchParams.set('type', type);
      if (status) searchParams.set('status', status);
      if (dateFrom) searchParams.set('dateFrom', dateFrom);
      if (dateTo) searchParams.set('dateTo', dateTo);
      searchParams.set('sort', sortConfig.key);
      searchParams.set('order', sortConfig.direction);

      const res = await fetch(`/api/admin/documentos?${searchParams.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.documents);
        setPagination({ page: data.page, totalPages: data.totalPages, total: data.total });
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
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

  const formatStatus = (status: string | null) => {
    const statuses: Record<string, { label: string; icon: any; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }> = {
      ACEPTADO: { label: 'Aceptado', icon: CheckCircle, variant: 'success' },
      RECHAZADO: { label: 'Rechazado', icon: XCircle, variant: 'destructive' },
      ANULADO: { label: 'Anulado', icon: Archive, variant: 'secondary' },
      PENDIENTE: { label: 'Pendiente', icon: Clock, variant: 'warning' },
      ERROR: { label: 'Error', icon: AlertCircle, variant: 'destructive' },
    };
    return statuses[status || ''] || { label: status || 'Desconocido', icon: FileText, variant: 'outline' };
  };

  const formatType = (type: string) => {
    const types: Record<string, string> = {
      INVOICE: 'Factura',
      RECEIPT: 'Boleta',
      CREDIT_NOTE: 'Nota de Crédito',
      DEBIT_NOTE: 'Nota de Débito',
      DELIVERY_NOTE: 'Guía de Remisión',
    };
    return types[type] || type;
  };

  const openVoidDialog = (doc: Document) => {
    setSelectedDocument(doc);
    setVoidForm({ reason: '' });
    setDialogOpen(true);
  };

  const handleVoidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument || !voidForm.reason.trim()) return;

    setIsVoiding(true);
    try {
      const res = await fetch(`/api/admin/documentos/${selectedDocument.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: voidForm.reason }),
      });
      if (res.ok) {
        setDialogOpen(false);
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al anular documento');
      }
    } catch (error) {
      alert('Error de conexión');
    } finally {
      setIsVoiding(false);
    }
  };

  const handleRegenerate = async (doc: Document) => {
    if (!doc.order?.id) return;
    if (!confirm('¿Regenerar documento? Esto creará uno nuevo con número consecutivo.')) return;

    try {
      const res = await fetch('/api/admin/documentos/generar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: doc.order.id, forceRegenerate: true }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        const error = await res.json();
        alert(error.error || 'Error al regenerar documento');
      }
    } catch (error) {
      alert('Error de conexión');
    }
  };

  const handleDownloadPdf = (doc: Document) => {
    if (doc.pdfUrl) {
      window.open(doc.pdfUrl, '_blank');
    } else {
      alert('PDF no disponible');
    }
  };

  const handleViewXml = (doc: Document) => {
    if (doc.xmlContent) {
      const blob = new Blob([doc.xmlContent], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    } else {
      alert('XML no disponible');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Documentos Electrónicos (SUNAT)
          </h1>
          <p className="text-muted-foreground">Gestiona facturas, boletas, notas de crédito y guías de remisión</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-6">
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-blue-600">{documents.filter(d => d.sunatStatus === 'ACEPTADO').length}</div><div className="text-sm text-muted-foreground">Aceptados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-red-600">{documents.filter(d => d.sunatStatus === 'RECHAZADO').length}</div><div className="text-sm text-muted-foreground">Rechazados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-gray-600">{documents.filter(d => d.sunatStatus === 'ANULADO').length}</div><div className="text-sm text-muted-foreground">Anulados</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-orange-600">{documents.filter(d => d.sunatStatus === 'PENDIENTE').length}</div><div className="text-sm text-muted-foreground">Pendientes</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-purple-600">{documents.filter(d => d.type === 'INVOICE').length}</div><div className="text-sm text-muted-foreground">Facturas</div></CardContent></Card>
        <Card><CardContent className="pt-6"><div className="text-2xl font-bold text-green-600">{documents.filter(d => d.type === 'RECEIPT').length}</div><div className="text-sm text-muted-foreground">Boletas</div></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-4 bg-card p-4 rounded-lg border">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por serie, número, orden, cliente..."
            value={search}
            onChange={(e) => { const p = new URLSearchParams(window.location.search); p.set('search', e.target.value); p.set('page', '1'); window.location.search = p.toString(); }}
            className="pl-10"
          />
        </div>
        <Select value={type} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('type', v); else p.delete('type'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Tipo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="INVOICE">Factura</SelectItem>
            <SelectItem value="RECEIPT">Boleta</SelectItem>
            <SelectItem value="CREDIT_NOTE">Nota Crédito</SelectItem>
            <SelectItem value="DEBIT_NOTE">Nota Débito</SelectItem>
            <SelectItem value="DELIVERY_NOTE">Guía Remisión</SelectItem>
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { const p = new URLSearchParams(window.location.search); if (v) p.set('status', v); else p.delete('status'); p.set('page', '1'); window.location.search = p.toString(); }}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado SUNAT" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            <SelectItem value="ACEPTADO">Aceptado</SelectItem>
            <SelectItem value="RECHAZADO">Rechazado</SelectItem>
            <SelectItem value="ANULADO">Anulado</SelectItem>
            <SelectItem value="PENDIENTE">Pendiente</SelectItem>
            <SelectItem value="ERROR">Error</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={dateFrom} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateFrom', e.target.value); else p.delete('dateFrom'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Desde" className="w-[160px]" />
        <Input type="date" value={dateTo} onChange={(e) => { const p = new URLSearchParams(window.location.search); if (e.target.value) p.set('dateTo', e.target.value); else p.delete('dateTo'); p.set('page', '1'); window.location.search = p.toString(); }} placeholder="Hasta" className="w-[160px]" />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-2">Tipo <getSortIcon key="type" /></div>
              </TableHead>
              <TableHead>Serie-Numero</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('orderNumber')}>
                <div className="flex items-center gap-2">Orden <getSortIcon key="orderNumber" /></div>
              </TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('customerName')}>
                <div className="flex items-center gap-2">Cliente <getSortIcon key="customerName" /></div>
              </TableHead>
              <TableHead>Documento</TableHead>
              <TableHead className="cursor-pointer" onClick={() => handleSort('createdAt')}>
                <div className="flex items-center gap-2">Fecha <getSortIcon key="createdAt" /></div>
              </TableHead>
              <TableHead>Estado SUNAT</TableHead>
              <TableHead className="w-[180px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow>
            ) : documents.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No se encontraron documentos</TableCell></TableRow>
            ) : (
              documents.map((d) => {
                const statusInfo = formatStatus(d.sunatStatus);
                return (
                  <TableRow key={d.id}>
                    <TableCell><Badge variant="outline">{formatType(d.type)}</Badge></TableCell>
                    <TableCell className="font-mono font-medium">{d.series}-{String(d.number).padStart(8, '0')}</TableCell>
                    <TableCell>
                      {d.order ? (
                        <span className="font-mono text-primary hover:underline cursor-pointer">{d.order.orderNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {d.order?.customerName ? (
                        <p className="font-medium">{d.order.customerName}</p>
                      ) : (
                        <p className="text-muted-foreground">Cliente no identificado</p>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {d.order?.customerDocument || '—'}
                    </TableCell>
                    <TableCell>{format(new Date(d.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>
                        <statusInfo.icon className="h-3 w-3 mr-1" /> {statusInfo.label}
                      </Badge>
                      {d.sunatResponse?.nota && (
                        <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{d.sunatResponse.nota}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {d.pdfUrl && (
                          <Button variant="ghost" size="icon" onClick={() => handleDownloadPdf(d)} title="Descargar PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        {d.xmlContent && (
                          <Button variant="ghost" size="icon" onClick={() => handleViewXml(d)} title="Ver XML">
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => openVoidDialog(d)} title="Anular" disabled={d.sunatStatus !== 'ACEPTADO' || isVoiding}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleRegenerate(d)} title="Regenerar" disabled={isVoiding}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
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
          <p className="text-sm text-muted-foreground">Mostrando {((page - 1) * 20) + 1} a {Math.min(page * 20, pagination.total)} de {pagination.total} documentos</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page - 1).toString()); window.location.search = p.toString(); }}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={page === pagination.totalPages} onClick={() => { const p = new URLSearchParams(window.location.search); p.set('page', (page + 1).toString()); window.location.search = p.toString(); }}>Siguiente</Button>
          </div>
        </div>
      )}

      {/* Dialog Anular */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anular Documento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleVoidSubmit} className="space-y-4">
            {selectedDocument && (
              <div className="text-sm text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
                <p><strong>Documento:</strong> {formatType(selectedDocument.type)} {selectedDocument.series}-{String(selectedDocument.number).padStart(8, '0')}</p>
                <p><strong>Orden:</strong> {selectedDocument.order?.orderNumber || '—'}</p>
                <p><strong>Cliente:</strong> {selectedDocument.order?.customerName || '—'}</p>
                <p><strong>Estado actual:</strong> {formatStatus(selectedDocument.sunatStatus).label}</p>
              </div>
            )}
            <div>
              <Label>Motivo de anulación *</Label>
              <Textarea
                value={voidForm.reason}
                onChange={e => setVoidForm(prev => ({ ...prev, reason: e.target.value }))}
                rows={4}
                required
                placeholder="Describa el motivo de la anulación (mínimo 5 caracteres)..."
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isVoiding}>Cancelar</Button>
              <Button type="submit" variant="destructive" disabled={isVoiding || !voidForm.reason.trim()}>
                {isVoiding ? 'Anulando...' : 'Anular Documento'}
              </Button>
            </DialogFooter          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}