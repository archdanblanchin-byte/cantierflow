import { base44 } from "@/api/base44Client";

// I file delle note personali (allegati e disegni) sono privati:
// si caricano in area privata e si aprono con un link temporaneo.

export async function caricaFilePrivato(file) {
  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  return file_uri;
}

export async function apriFilePrivato(file_uri) {
  const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri });
  window.open(signed_url, "_blank");
}