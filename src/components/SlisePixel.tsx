'use client';

import Script from 'next/script';

export default function SlisePixel() {
  const advId = process.env.NEXT_PUBLIC_SLISE_ADV_ID;

  if (!advId) return null;

  return (
    <Script
      id="slise-pix3l-loader"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `!function(p,i,x,e,l,s){p.slq||(s=p.slq=function(){s.exe?s.exe.apply(s,arguments):s.queue.push(arguments)},s.queue=[],l=i.createElement(x),l.async=!0,l.src='https://v1.slise.xyz/scripts/pix3l.js',l.id='slise-pix3l',l.setAttribute('data-slise-adv-id',e),e=i.getElementsByTagName(x)[0],e.parentNode.insertBefore(l,e))}(window,document,'script','${advId}');`,
      }}
    />
  );
}
