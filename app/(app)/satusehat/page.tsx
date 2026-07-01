"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Hospital,
  Loader2,
  Stethoscope,
  User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { orpc } from "@/lib/orpc/client";

export default function SatuSehatPage() {
  const [participantSearch, setParticipantSearch] = useState("");
  const [facilitySearch, setFacilitySearch] = useState("");
  const [selectedParticipantId, setSelectedParticipantId] = useState<
    number | undefined
  >();
  const [selectedFacilityId, setSelectedFacilityId] = useState<
    number | undefined
  >();
  const [doctorNik, setDoctorNik] = useState("");
  const [locationName, setLocationName] = useState("Poli Umum");
  const [status, setStatus] = useState<"arrived" | "in-progress">("arrived");

  // Fetch data for selections
  const { data: participants, isLoading: isLoadingParticipants } = useQuery(
    orpc.jkn.participant.list.queryOptions({
      input: { search: participantSearch || undefined, limit: 10 },
    })
  );

  const { data: facilities, isLoading: isLoadingFacilities } = useQuery(
    orpc.jkn.facility.listHealthcareFacilities.queryOptions({
      input: { search: facilitySearch || undefined, limit: 10 },
    })
  );

  // POC Mutation
  const triggerPOC = useMutation(
    orpc.satusehat.triggerEncounterPOC.mutationOptions({
      onSuccess: (data) => {
        if (data.success) {
          toast.success("Encounter Berhasil!", {
            description: `Encounter ID: ${data.encounterId}`,
          });
        } else {
          toast.error("Gagal memicu POC", {
            description: data.message,
          });
        }
      },
      onError: (error) => {
        toast.error("Terjadi kesalahan sistem", {
          description: error.message,
        });
      },
    })
  );

  const handleTrigger = () => {
    if (!(selectedParticipantId && selectedFacilityId && doctorNik)) {
      toast.error("Mohon lengkapi semua data");
      return;
    }

    triggerPOC.mutate({
      participantId: selectedParticipantId,
      facilityId: selectedFacilityId,
      doctorNik,
      locationName,
      status,
    });
  };

  const isExecuting = triggerPOC.isPending;
  const result = triggerPOC.data;

  const participantOptions =
    participants?.data.map((p) => ({
      value: p.id,
      label: `${p.firstName} ${p.lastName || ""}`,
      description: `NIK: ${p.identityNumber}`,
    })) || [];

  const facilityOptions =
    facilities?.map((f) => ({
      value: f.id,
      label: f.name,
      description: `Kode: ${f.code} • IHS ID: ${f.satusehatId || "Belum Enrolled"}`,
    })) || [];

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="font-bold text-3xl tracking-tight">
          Integrasi SatuSehat IHS
        </h1>
        <p className="text-muted-foreground">
          Pendaftaran kedatangan (Encounter) pasien ke sistem nasional
          SatuSehat.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Form */}
        <div className="space-y-6">
          <Card className="border-t-4 border-t-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Enrollment Pasien (POC)
              </CardTitle>
              <CardDescription>
                Mendaftarkan status Arrived/In-Progress tanpa rekam medis.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Participant Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold text-sm">
                  <User className="h-4 w-4" /> 1. Pilih Peserta
                </Label>
                <Combobox
                  isLoading={isLoadingParticipants}
                  onSearchChange={setParticipantSearch}
                  onValueChange={setSelectedParticipantId}
                  options={participantOptions}
                  placeholder="Pilih Peserta..."
                  searchPlaceholder="Cari NIK atau Nama..."
                  value={selectedParticipantId}
                />
              </div>

              <Separator />

              {/* Facility Selection */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2 font-semibold text-sm">
                  <Hospital className="h-4 w-4" /> 2. Pilih Faskes
                </Label>
                <Combobox
                  isLoading={isLoadingFacilities}
                  onSearchChange={setFacilitySearch}
                  onValueChange={setSelectedFacilityId}
                  options={facilityOptions}
                  placeholder="Pilih Faskes..."
                  searchPlaceholder="Cari Kode atau Nama Faskes..."
                  value={selectedFacilityId}
                />
              </div>

              <Separator />

              {/* Doctor & Location */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="doctor-nik">NIK Dokter</Label>
                  <Input
                    id="doctor-nik"
                    onChange={(e) => setDoctorNik(e.target.value)}
                    placeholder="Masukkan NIK Dokter..."
                    value={doctorNik}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Poli / Ruangan</Label>
                  <Input
                    id="location"
                    onChange={(e) => setLocationName(e.target.value)}
                    value={locationName}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <Label>Status Kunjungan</Label>
                <RadioGroup
                  className="flex gap-4"
                  onValueChange={(v: any) => setStatus(v)}
                  value={status}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="arrived" value="arrived" />
                    <Label className="cursor-pointer" htmlFor="arrived">
                      Arrived
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem id="in-progress" value="in-progress" />
                    <Label className="cursor-pointer" htmlFor="in-progress">
                      In-Progress
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button
                className="h-12 w-full font-bold text-lg shadow-lg shadow-primary/20"
                disabled={isExecuting}
                onClick={handleTrigger}
              >
                {isExecuting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Memproses IHS...
                  </>
                ) : (
                  "Kirim Encounter ke SatuSehat"
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Execution Status */}
        <div className="space-y-6">
          <Card className="h-full border-dashed bg-slate-50 dark:bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-lg">
                Status Eksekusi (The 4+1 Prep)
              </CardTitle>
              <CardDescription>
                Alur relasional SatuSehat yang harus dipenuhi.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!(result || isExecuting) && (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <AlertCircle className="mb-4 h-12 w-12 opacity-20" />
                  <p>
                    Belum ada aktivitas. Silakan lengkapi formulir dan kirim.
                  </p>
                </div>
              )}

              {(isExecuting || result) && (
                <div className="space-y-4">
                  {[
                    "Step 1: Organization Reference",
                    "Step 2: Location (Room) POST",
                    "Step 3: Patient IHS GET",
                    "Step 4: Practitioner IHS GET",
                    "Final: Encounter POST",
                  ].map((stepName, i) => {
                    const stepData = result?.details?.find(
                      (d: any) => d.step === i + 1
                    );
                    const isStepExecuting =
                      isExecuting && (result?.details?.length ?? 0) === i;
                    const isSuccess =
                      !!stepData && stepData.status === "SUCCESS";

                    // Final step special handling
                    const isFinal = i === 4;
                    const isFinalSuccess = result?.success && isFinal;

                    return (
                      <div
                        className={`flex items-center justify-between rounded-xl border p-4 transition-all ${
                          isSuccess || isFinalSuccess
                            ? "border-green-500/20 bg-green-500/10"
                            : "bg-background"
                        }`}
                        key={i}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full font-bold text-sm ${
                              isSuccess || isFinalSuccess
                                ? "bg-green-500 text-white"
                                : isStepExecuting
                                  ? "bg-primary text-white"
                                  : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isSuccess || isFinalSuccess ? (
                              <CheckCircle2 className="h-5 w-5" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span
                              className={`font-medium ${isSuccess || isFinalSuccess ? "text-green-700 dark:text-green-400" : ""}`}
                            >
                              {stepName}
                            </span>
                            {(isSuccess || isFinalSuccess) && (
                              <span className="max-w-[200px] truncate font-mono text-[10px] text-muted-foreground">
                                ID: {stepData?.id || result?.encounterId}
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          {isStepExecuting && (
                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                          )}
                          {(isSuccess || isFinalSuccess) && (
                            <ChevronRight className="h-5 w-5 text-green-500" />
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {result && !result.success && (
                    <div className="flex gap-3 rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-destructive text-sm">
                      <AlertCircle className="h-5 w-5 shrink-0" />
                      <div>
                        <p className="font-bold">Error Terdeteksi:</p>
                        <p className="opacity-90">{result.message}</p>
                      </div>
                    </div>
                  )}

                  {result?.success && (
                    <div className="rounded-2xl bg-green-600 p-6 text-white shadow-green-600/20 shadow-xl">
                      <h3 className="mb-1 font-bold text-lg">
                        Berhasil Terdaftar!
                      </h3>
                      <p className="mb-4 text-sm opacity-90">
                        Pasien telah resmi tercatat di SatuSehat Nasional.
                      </p>
                      <div className="break-all rounded-lg bg-white/20 p-3 font-mono text-xs">
                        Encounter ID: {result.encounterId}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
