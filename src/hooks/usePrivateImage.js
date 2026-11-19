import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Immagine privata: link firmato → blob locale (evita problemi di accesso e di esportazione).
export default function usePrivateImage(fileUri) {
  const { data, isLoading } = useQuery({
    queryKey: ["private-image", fileUri],
    enabled: !!fileUri,
    staleTime: Infinity,
    queryFn: async () => {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri, expires_in: 600 });
      const blob = await (await fetch(signed_url)).blob();
      return URL.createObjectURL(blob);
    },
  });
  return { url: data || null, isLoading };
}