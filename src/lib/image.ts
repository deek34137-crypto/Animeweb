export function proxyUrl(url: string | null | undefined): string {
  if (!url) return '';
  
  // Supported CDNs for anime posters, banners, and avatars
  if (
    url.includes('myanimelist.net') ||
    url.includes('anilist.co') ||
    url.includes('thetvdb.com') ||
    url.includes('youtube.com') ||
    url.includes('ytimg.com')
  ) {
    if (!url.startsWith('/api/image-proxy')) {
      return `/api/image-proxy?url=${encodeURIComponent(url)}`;
    }
  }
  return url;
}

export function rewriteImages(obj: any): any {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    return proxyUrl(obj);
  }
  if (Array.isArray(obj)) {
    return obj.map(rewriteImages);
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key in obj) {
      if (
        typeof obj[key] === 'string' &&
        (key === 'image_url' ||
          key === 'small_image_url' ||
          key === 'large_image_url' ||
          key === 'poster' ||
          key === 'animeImage' ||
          key === 'avatar' ||
          key === 'banner' ||
          key === 'logo' ||
          key === 'coverImage')
      ) {
        newObj[key] = proxyUrl(obj[key]);
      } else if (key === 'animeSnapshot' && obj[key] && typeof obj[key] === 'object') {
        newObj[key] = rewriteImages(obj[key]);
      } else {
        newObj[key] = rewriteImages(obj[key]);
      }
    }
    return newObj;
  }
  return obj;
}
