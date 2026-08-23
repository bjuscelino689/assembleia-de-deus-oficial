export default async function handler(req: any, res: any) {
  try {
    const rawQuery = ((req.query?.q as string) || "").trim();
    if (!rawQuery) {
      return res.status(200).json({ results: [] });
    }

    const normalize = (str: string) =>
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

    const normQuery = normalize(rawQuery);
    const numberOnlyMatch = rawQuery.replace(/\D/g, "");
    const isNumberSearch = Boolean(numberOnlyMatch && (
      /^\d+$/.test(rawQuery) || 
      normQuery.startsWith("hino ") || 
      normQuery.startsWith("harpa ") || 
      normQuery.startsWith("#") ||
      normQuery.includes("harpa crista")
    ));

    let searchQuery = "";
    if (isNumberSearch && numberOnlyMatch) {
      searchQuery = `Harpa Cristã ${numberOnlyMatch} cantado oficial hino`;
    } else {
      searchQuery = `${rawQuery} louvor gospel`;
    }

    const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
    const ytRes = await fetch(ytUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        "Cache-Control": "no-cache"
      }
    });

    if (ytRes.ok) {
      const html = await ytRes.text();
      let data: any = null;

      const match = html.match(/var ytInitialData = ({.*?});<\/script>/) ||
                    html.match(/ytInitialData\s*=\s*({.+?});/);
      if (match && match[1]) {
        try {
          data = JSON.parse(match[1]);
        } catch (e) {}
      }

      if (data) {
        const sections = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const ytResults: any[] = [];
        const seenIds = new Set<string>();

        for (const sec of sections) {
          const items = sec.itemSectionRenderer?.contents || [];
          for (const item of items) {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const videoId = v.videoId;
              if (!videoId || seenIds.has(videoId)) continue;
              seenIds.add(videoId);

              const rawTitle = v.title?.runs?.map((r: any) => r.text).join("") || v.title?.simpleText || "";
              const rawArtist = v.ownerText?.runs?.[0]?.text || v.shortBylineText?.runs?.[0]?.text || (isNumberSearch ? "Harpa Cristã (Cantado)" : rawQuery);
              const duration = v.lengthText?.simpleText || "04:00";
              const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

              const cleanTitle = rawTitle
                .replace(/\(Vídeo Oficial\)/gi, "")
                .replace(/\(Clipe Oficial\)/gi, "")
                .replace(/\(Áudio Oficial\)/gi, "")
                .replace(/\(Lyric Video\)/gi, "")
                .replace(/\(Oficial\)/gi, "")
                .replace(/\|.*$/g, "")
                .replace(/- MK MUSIC/gi, "")
                .replace(/- Todah Music/gi, "")
                .replace(/- Som Livre/gi, "")
                .replace(/^[^\w\s\(\)]+/g, "")
                .trim();

              ytResults.push({
                id: `yt_${videoId}`,
                youtubeId: videoId,
                number: isNumberSearch ? Number(numberOnlyMatch) : undefined,
                title: cleanTitle || rawTitle,
                artist: rawArtist,
                duration: duration,
                coverUrl: thumbnail,
                category: (rawTitle.toLowerCase().includes("harpa") || isNumberSearch) ? "harpa" : "adoracao",
                tags: [normQuery, normalize(rawArtist), normalize(cleanTitle)]
              });
            }
          }
        }

        if (ytResults.length > 0) {
          return res.status(200).json({ results: ytResults.slice(0, 25) });
        }
      }
    }

    return res.status(200).json({ results: [] });
  } catch (err: any) {
    return res.status(200).json({ results: [] });
  }
}
