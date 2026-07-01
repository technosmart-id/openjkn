"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CheckCircle2,
  Clock,
  Database,
  FileText,
  Info,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { orpc } from "@/lib/orpc/client";
import {
  formatBpjsNumber,
  formatDate,
  formatDateTime,
} from "@/lib/utils/format";

type SegmentType =
  | "all"
  | "PU_PNS_PUSAT"
  | "PU_PNS_DAERAH"
  | "PU_PNS_POLRI"
  | "PU_PNS_TNI_AD"
  | "PU_PNS_TNI_AL"
  | "PU_PNS_TNI_AU"
  | "PU_PNS_MABES_TNI"
  | "PU_PNS_KEMHAN"
  | "PU_TNI_AD"
  | "PU_TNI_AL"
  | "PU_TNI_AU"
  | "PU_POLRI"
  | "PU_PPNPN"
  | "PU_BUMN"
  | "PU_BUMD"
  | "PU_SWASTA"
  | "PBPU"
  | "BP"
  | "INVESTOR"
  | "PEMBERI_KERJA"
  | "PENSIUNAN_PNS"
  | "PENSIUNAN_TNI_POLRI"
  | "PENSIUNAN_BUMN"
  | "PENSIUNAN_SWASTA"
  | "PBI_APBN"
  | "PBI_APBD";

type ParticipantSegment =
  | "PU_PNS_PUSAT"
  | "PU_PNS_DAERAH"
  | "PU_PNS_POLRI"
  | "PU_PNS_TNI_AD"
  | "PU_PNS_TNI_AL"
  | "PU_PNS_TNI_AU"
  | "PU_PNS_MABES_TNI"
  | "PU_PNS_KEMHAN"
  | "PU_TNI_AD"
  | "PU_TNI_AL"
  | "PU_TNI_AU"
  | "PU_POLRI"
  | "PU_PPNPN"
  | "PU_BUMN"
  | "PU_BUMD"
  | "PU_SWASTA"
  | "PBPU"
  | "BP"
  | "INVESTOR"
  | "PEMBERI_KERJA"
  | "PENSIUNAN_PNS"
  | "PENSIUNAN_TNI_POLRI"
  | "PENSIUNAN_BUMN"
  | "PENSIUNAN_SWASTA"
  | "PBI_APBN"
  | "PBI_APBD";

type SyncStatus = "synced" | "pending" | "error" | "syncing";

type PingResult = {
  status: string;
  connected: boolean;
  latencyMs?: number;
  error?: string;
  version?: string;
  serverTime?: string;
  database?: string;
  user?: string;
  host?: string;
  port?: string;
  connectionString?: string;
  checkedAt: string;
};

type PingRow = [label: string, value: string];

/**
 * Build the key/value rows displayed in the ping result dialog.
 */
function buildPingRows(result: PingResult): PingRow[] {
  const host = result.host ? `${result.host}:${result.port ?? ""}` : "-";
  if (result.connected) {
    return [
      ["Host", host],
      ["Database", result.database ?? "-"],
      ["User", result.user ?? "-"],
      ["Server Time", formatDateTime(result.serverTime ?? null)],
      ["Versi PostgreSQL", result.version ?? "-"],
      ["Connection String", result.connectionString ?? "-"],
    ];
  }
  return [
    ["Host", host],
    ["Database", result.database ?? "-"],
    ["Connection String", result.connectionString ?? "-"],
  ];
}

export default function SyncPage() {
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<SegmentType>("all");
  const [page, setPage] = useState(1);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());
  const [pingOpen, setPingOpen] = useState(false);
  const [pingResult, setPingResult] = useState<PingResult | null>(null);

  // Fetch participants for sync
  const { data, isPending, refetch } = useQuery(
    orpc.jkn.participant.list.queryOptions({
      input: {
        search: search || undefined,
        segment:
          segment === "all" ? undefined : (segment as ParticipantSegment),
        status: "active",
        page,
        limit: 10,
      },
    })
  );

  // Sync mutation
  const syncMutation = useMutation({
    mutationFn: async (participantId: number) => {
      setSyncingIds((prev) => new Set(prev).add(participantId));

      const response = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Sync failed");
      }

      return response.json();
    },
    onSuccess: (_, participantId) => {
      toast.success("Sinkronisasi Berhasil", {
        description: "Data peserta telah disinkronkan ke openIMIS",
      });
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    },
    onError: (error, participantId) => {
      toast.error("Sinkronisasi Gagal", {
        description: error.message,
      });
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(participantId);
        return next;
      });
    },
  });

  // Ping openIMIS database connection
  const pingMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/sync/ping");
      return (await response.json()) as PingResult;
    },
    onSuccess: (result) => {
      setPingResult(result);
      if (result.connected) {
        toast.success("Koneksi openIMIS berhasil", {
          description: `Latensi ${result.latencyMs ?? "?"} ms`,
        });
      } else {
        toast.error("Koneksi openIMIS gagal", {
          description: result.error,
        });
      }
    },
    onError: (error) => {
      toast.error("Ping gagal", { description: error.message });
    },
  });

  const handlePing = () => {
    setPingResult(null);
    setPingOpen(true);
    pingMutation.mutate();
  };

  const handleSync = (participantId: number) => {
    syncMutation.mutate(participantId);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  // Mock sync status (in real implementation, this would come from the database)
  const getSyncStatus = (participantId: number): SyncStatus => {
    if (syncingIds.has(participantId)) return "syncing";
    // Simulate varied sync status for demo
    const hash = participantId % 3;
    if (hash === 0) return "synced";
    if (hash === 1) return "pending";
    return "error";
  };

  const stats = {
    total: data?.total || 0,
    synced: Math.floor((data?.total || 0) * 0.65),
    pending: Math.floor((data?.total || 0) * 0.25),
    error: Math.floor((data?.total || 0) * 0.1),
  };

  // Rows rendered in the ping result dialog
  const pingRows: PingRow[] = pingResult ? buildPingRows(pingResult) : [];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-bold text-2xl">Sinkronisasi openIMIS</h1>
          <p className="text-muted-foreground">
            Kelola sinkronisasi data peserta JKN ke openIMIS
          </p>
        </div>
        <Button
          disabled={pingMutation.isPending}
          onClick={handlePing}
          size="sm"
          variant="outline"
        >
          {pingMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Activity className="mr-2 h-4 w-4" />
          )}
          Ping openIMIS
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Total Peserta
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.total}</div>
            <p className="text-muted-foreground text-xs">
              Peserta aktif dalam sistem
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Tersinkronisasi
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.synced}</div>
            <p className="text-muted-foreground text-xs">
              {Math.round((stats.synced / Math.max(stats.total, 1)) * 100)}%
              dari total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Belum Disinkronkan
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.pending}</div>
            <p className="text-muted-foreground text-xs">
              Menunggu sinkronisasi
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="font-medium text-muted-foreground text-sm">
              Gagal Sinkronisasi
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{stats.error}</div>
            <p className="text-muted-foreground text-xs">
              Perlu penanganan manual
            </p>
          </CardContent>
        </Card>
      </div>

      {/* About openIMIS Sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Tentang Sinkronisasi openIMIS
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <p className="mb-4 text-muted-foreground">
            openIMIS adalah sistem manajemen asuransi kesehatan open-source yang
            digunakan untuk mengelola data kepesertaan, klaim, dan manfaat.
            Fitur sinkronisasi ini memungkinkan data peserta JKN ditransfer ke
            openIMIS untuk pemrosesan lebih lanjut.
          </p>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/20">
                <Database className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Mapping Data</p>
                <p className="text-muted-foreground text-xs">
                  Data JKN dipetakan ke skema openIMIS (tblInsuree, tblFamilies,
                  tblPolicy)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <Shield className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Validasi</p>
                <p className="text-muted-foreground text-xs">
                  Data divalidasi sebelum disinkronkan untuk memastikan
                  konsistensi
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/20">
                <RefreshCw className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">Sinkronisasi Ulang</p>
                <p className="text-muted-foreground text-xs">
                  Data yang sudah ada akan diperbarui jika ada perubahan
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Sync List */}
      <div>
        <h2 className="mb-4 font-semibold text-lg">Daftar Peserta</h2>

        {/* Filters */}
        <div className="mb-4 flex gap-4">
          <div className="relative flex-1">
            <FileText className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-10"
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Cari berdasarkan nama, nomor BPJS, atau NIK..."
              value={search}
            />
          </div>

          <Select
            onValueChange={(v) => setSegment(v as SegmentType)}
            value={segment}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Segmen Peserta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Segmen</SelectItem>
              <SelectItem value="PU_PNS_PUSAT">PNS Pusat</SelectItem>
              <SelectItem value="PU_PNS_DAERAH">PNS Daerah</SelectItem>
              <SelectItem value="PU_TNI_AD">TNI AD</SelectItem>
              <SelectItem value="PU_TNI_AL">TNI AL</SelectItem>
              <SelectItem value="PU_TNI_AU">TNI AU</SelectItem>
              <SelectItem value="PU_POLRI">POLRI</SelectItem>
              <SelectItem value="PU_BUMN">BUMN</SelectItem>
              <SelectItem value="PU_SWASTA">Swasta</SelectItem>
              <SelectItem value="PBPU">PBPU</SelectItem>
              <SelectItem value="BP">Bukan Pekerja</SelectItem>
              <SelectItem value="PENSIUNAN_PNS">Pensiunan PNS</SelectItem>
              <SelectItem value="PBI_APBN">PBI APBN</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>

        {/* Table */}
        {isPending ? (
          <div className="flex items-center justify-center p-8">
            <Spinner />
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status Sync</TableHead>
                  <TableHead>No. BPJS</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>NIK</TableHead>
                  <TableHead>Segmen</TableHead>
                  <TableHead>Kelas</TableHead>
                  <TableHead>Tgl Daftar</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell className="text-center" colSpan={8}>
                      Tidak ada data peserta
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((participant) => {
                    const syncStatus = getSyncStatus(participant.id);
                    return (
                      <TableRow key={participant.id}>
                        <TableCell>
                          {syncStatus === "syncing" ? (
                            <Badge
                              className="bg-blue-100 text-blue-800 hover:bg-blue-100"
                              variant="outline"
                            >
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                              Menyinkronkan
                            </Badge>
                          ) : syncStatus === "synced" ? (
                            <Badge
                              className="bg-green-100 text-green-800 hover:bg-green-100"
                              variant="outline"
                            >
                              <CheckCircle2 className="mr-1 h-3 w-3" />
                              Tersinkronisasi
                            </Badge>
                          ) : syncStatus === "error" ? (
                            <Badge
                              className="bg-red-100 text-red-800 hover:bg-red-100"
                              variant="outline"
                            >
                              <XCircle className="mr-1 h-3 w-3" />
                              Gagal
                            </Badge>
                          ) : (
                            <Badge
                              className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                              variant="outline"
                            >
                              <Clock className="mr-1 h-3 w-3" />
                              Belum
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="font-medium">
                          {formatBpjsNumber(participant.bpjsNumber)}
                        </TableCell>
                        <TableCell>
                          {participant.firstName}
                          {participant.lastName && ` ${participant.lastName}`}
                        </TableCell>
                        <TableCell>{participant.identityNumber}</TableCell>
                        <TableCell>{participant.participantSegment}</TableCell>
                        <TableCell>
                          Kelas {participant.treatmentClass}
                        </TableCell>
                        <TableCell>
                          {formatDate(participant.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              disabled={syncingIds.has(participant.id)}
                              onClick={() => handleSync(participant.id)}
                              size="sm"
                              variant="outline"
                            >
                              {syncingIds.has(participant.id) ? (
                                <>
                                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                                  Syncing
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="mr-1 h-3 w-3" />
                                  Sync
                                </>
                              )}
                            </Button>
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/peserta/${participant.id}`}>
                                <ArrowRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            {/* Pagination */}
            {!!data && data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between">
                <p className="text-muted-foreground text-sm">
                  Halaman {data.page} dari {data.totalPages} ({data.total} data)
                </p>
                <div className="flex gap-2">
                  <Button
                    disabled={page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    size="sm"
                    variant="outline"
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    disabled={page === data.totalPages}
                    onClick={() =>
                      setPage((p) => Math.min(data.totalPages, p + 1))
                    }
                    size="sm"
                    variant="outline"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Documentation Link */}
      <Card>
        <CardHeader>
          <CardTitle>Dokumentasi Teknis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-muted-foreground text-sm">
            Pelajari lebih lanjut tentang proses sinkronisasi dan struktur data
            openIMIS.
          </p>
          <div className="flex gap-4">
            <Button asChild size="sm" variant="outline">
              <Link href="/docs/enrollment-and-sync">
                <FileText className="mr-2 h-4 w-4" />
                Panduan Sinkronisasi
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href="https://openimis.org" rel="noopener" target="_blank">
                <ArrowRight className="mr-2 h-4 w-4" />
                Kunjungi openIMIS.org
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ping openIMIS Dialog */}
      <Dialog onOpenChange={setPingOpen} open={pingOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pingMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : pingResult?.connected ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <XCircle className="h-5 w-5 text-red-600" />
              )}
              Ping openIMIS Database
            </DialogTitle>
            <DialogDescription>
              Memeriksa koneksi ke database openIMIS eksternal
              (OPENIMIS_DATABASE_URL)
            </DialogDescription>
          </DialogHeader>

          {pingMutation.isPending ? (
            <div className="flex items-center justify-center py-8">
              <Spinner />
            </div>
          ) : pingResult ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                {pingResult.connected ? (
                  <Badge
                    className="bg-green-100 text-green-800 hover:bg-green-100"
                    variant="outline"
                  >
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Terhubung
                  </Badge>
                ) : (
                  <Badge
                    className="bg-red-100 text-red-800 hover:bg-red-100"
                    variant="outline"
                  >
                    <XCircle className="mr-1 h-3 w-3" />
                    Gagal Terhubung
                  </Badge>
                )}
                {typeof pingResult.latencyMs === "number" && (
                  <span className="flex items-center gap-1 text-muted-foreground text-xs">
                    <Server className="h-3 w-3" />
                    {pingResult.latencyMs} ms
                  </span>
                )}
              </div>

              <div className="space-y-2 text-sm">
                {pingRows.map(([label, value]) => (
                  <div className="flex justify-between gap-4" key={label}>
                    <span className="text-muted-foreground">{label}</span>
                    <span className="break-all text-right font-medium">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {!pingResult.connected && pingResult.error ? (
                <div className="rounded-md bg-red-50 p-3 text-red-800 text-xs dark:bg-red-950/40 dark:text-red-300">
                  {pingResult.error}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            <Button
              disabled={pingMutation.isPending}
              onClick={handlePing}
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Ping Ulang
            </Button>
            <Button onClick={() => setPingOpen(false)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
