'use client';

import Script from 'next/script';

export default function TwitterPixel() {
  const twitterPixelId = process.env.NEXT_PUBLIC_TWITTER_PIXEL_ID;

  if (!twitterPixelId) {
    console.warn('Twitter Pixel ID not found');
    return null;
  }

  return (
    <Script
      id="twitter-pixel"
      strategy="lazyOnload"
      dangerouslySetInnerHTML={{
        __html: `
          !function(e,t,n,s,u,a){e.twq||(s=e.twq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments);
          },s.version='1.1',s.queue=[],u=t.createElement(n),u.async=!0,u.src='https://static.ads-twitter.com/uwt.js',
          a=t.getElementsByTagName(n)[0],a.parentNode.insertBefore(u,a))}(window,document,'script');
          twq('config','${twitterPixelId}');
        `,
      }}
    />
  );
}
