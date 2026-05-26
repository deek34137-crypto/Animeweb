// Streaming Availability Service supporting live RapidAPI and a deterministic high-fidelity mock fallback

export interface StreamingPlatform {
  name: string;
  logo: string;
  url: string;
  quality: string;
  audio: string[];
  subtitles: string[];
}

export interface StreamingResult {
  isAvailable: boolean;
  platforms: StreamingPlatform[];
  allAudio: string[];
  allSubtitles: string[];
}

const SUPPORTED_LANGS = {
  ja: 'JP',
  en: 'EN',
  es: 'ES',
  hi: 'HI',
  ta: 'TA',
  te: 'TE',
  ml: 'ML'
};

const PLATFORMS_DETAILS = {
  netflix: { name: 'Netflix', logo: '🔴' },
  crunchyroll: { name: 'Crunchyroll', logo: '🟠' },
  hulu: { name: 'Hulu', logo: '🟢' },
  prime: { name: 'Prime Video', logo: '🔵' },
  disney: { name: 'Disney+', logo: '⚪' }
};

export const StreamingService = {
  getStreamingInfo: async (malId: number, title: string): Promise<StreamingResult> => {
    const apiKey = process.env.NEXT_PUBLIC_RAPIDAPI_KEY;

    if (apiKey) {
      try {
        const response = await fetch(
          `https://streaming-availability.p.rapidapi.com/v2/show/details/by/id?imdbId=mal-${malId}`,
          {
            headers: {
              'X-RapidAPI-Key': apiKey,
              'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          const services = result.result?.streamingInfo?.us || {};
          const platforms: StreamingPlatform[] = [];
          const audioSet = new Set<string>();
          const subSet = new Set<string>();

          Object.keys(services).forEach(serviceKey => {
            const episodes = services[serviceKey];
            if (Array.isArray(episodes) && episodes.length > 0) {
              const ep = episodes[0];
              const rawAudio = ep.audio || [];
              const rawSubs = ep.subtitles || [];

              const audio: string[] = rawAudio
                .map((lang: string) => (SUPPORTED_LANGS as any)[lang.toLowerCase()] || lang.toUpperCase())
                .filter((v: string) => Object.values(SUPPORTED_LANGS).includes(v));

              const subtitles: string[] = rawSubs
                .map((lang: string) => (SUPPORTED_LANGS as any)[lang.toLowerCase()] || lang.toUpperCase())
                .filter((v: string) => Object.values(SUPPORTED_LANGS).includes(v));

              audio.forEach(a => audioSet.add(a));
              subtitles.forEach(s => subSet.add(s));

              const details = (PLATFORMS_DETAILS as any)[serviceKey.toLowerCase()] || {
                name: serviceKey.toUpperCase(),
                logo: '📺'
              };

              platforms.push({
                name: details.name,
                logo: details.logo,
                url: ep.link || '#',
                quality: (ep.quality || 'HD').toUpperCase(),
                audio,
                subtitles
              });
            }
          });

          // Ensure standard defaults if parsing returned empty lists
          if (audioSet.size === 0) audioSet.add('JP').add('EN');
          if (subSet.size === 0) subSet.add('EN');

          return {
            isAvailable: platforms.length > 0,
            platforms,
            allAudio: Array.from(audioSet),
            allSubtitles: Array.from(subSet)
          };
        }
      } catch (err) {
        console.warn('RapidAPI Fetch error, falling back to mock provider:', err);
      }
    }

    // High-fidelity, deterministic Mock Fallback
    // Based on malId so it stays consistent for each anime!
    const hash = (malId * 31) % 100;
    const platforms: StreamingPlatform[] = [];
    const audioSet = new Set<string>(['JP']); // JP audio is standard
    const subSet = new Set<string>(['EN']);   // EN subs are standard

    // Deterministic distribution of platforms
    if (hash % 2 === 0) {
      // Crunchyroll
      const audio = ['JP', 'EN'];
      if (hash % 4 === 0) audio.push('ES');
      const subs = ['EN', 'ES'];
      if (hash % 6 === 0) subs.push('HI');

      audio.forEach(a => audioSet.add(a));
      subs.forEach(s => subSet.add(s));

      platforms.push({
        name: 'Crunchyroll',
        logo: '🟠',
        url: `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
        quality: 'HD',
        audio,
        subtitles: subs
      });
    }

    if (hash % 3 === 0 || malId === 21) {
      // Netflix (Special trigger for popular/trending or malId 21)
      const audio = ['JP', 'EN', 'HI'];
      if (hash % 6 === 0) audio.push('TA', 'TE', 'ML');
      const subs = ['EN', 'HI', 'TA', 'TE', 'ML', 'ES'];

      audio.forEach(a => audioSet.add(a));
      subs.forEach(s => subSet.add(s));

      platforms.push({
        name: 'Netflix',
        logo: '🔴',
        url: `https://www.netflix.com/search?q=${encodeURIComponent(title)}`,
        quality: '4K',
        audio,
        subtitles: subs
      });
    }

    if (hash % 5 === 0) {
      // Hulu / Disney+
      const audio = ['JP', 'EN'];
      const subs = ['EN', 'ES'];

      audio.forEach(a => audioSet.add(a));
      subs.forEach(s => subSet.add(s));

      platforms.push({
        name: 'Hulu',
        logo: '🟢',
        url: `https://www.hulu.com/search?q=${encodeURIComponent(title)}`,
        quality: 'HD',
        audio,
        subtitles: subs
      });
    }

    if (platforms.length === 0) {
      // Guaranteed fallback to crunchyroll + prime
      audioSet.add('EN');
      subSet.add('ES');
      platforms.push({
        name: 'Crunchyroll',
        logo: '🟠',
        url: `https://www.crunchyroll.com/search?q=${encodeURIComponent(title)}`,
        quality: 'HD',
        audio: ['JP', 'EN'],
        subtitles: ['EN', 'ES']
      });
      platforms.push({
        name: 'Prime Video',
        logo: '🔵',
        url: `https://www.amazon.com/s?k=${encodeURIComponent(title)}`,
        quality: 'HD',
        audio: ['JP'],
        subtitles: ['EN']
      });
    }

    return {
      isAvailable: true,
      platforms,
      allAudio: Array.from(audioSet),
      allSubtitles: Array.from(subSet)
    };
  }
};
