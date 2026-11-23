// Assets: 11 Frames
import frameVintageGold from '../assets/frames/vintage-gold.svg';
import frameVintage from '../assets/frames/vintage-frame.svg';
import frameNeonCyber from '../assets/frames/neon-cyber.svg';
import frameFloralBloom from '../assets/frames/floral-bloom.svg';
import frameRetroFilm from '../assets/frames/retro-film.svg';
import frameCutePastel from '../assets/frames/cute-pastel.svg';
import frameBirthdayParty from '../assets/frames/birthday-party.svg';
import frameMinimalistBlack from '../assets/frames/minimalist-black.svg';
import frameComicPop from '../assets/frames/comic-pop.svg';
import frameLoveRomance from '../assets/frames/love-romance.svg';
import frameFestiveSparkle from '../assets/frames/festive-sparkle.svg';
import frameY2kChrome from '../assets/frames/y2k-chrome.svg';
import framePolaroidCream from '../assets/frames/polaroid-cream.svg';

// Assets: 10 Stickers
import stickerStar from '../assets/stickers/star.svg';
import stickerHeart from '../assets/stickers/heart.svg';
import stickerCrown from '../assets/stickers/crown.svg';
import stickerSunglasses from '../assets/stickers/sunglasses.svg';
import stickerSparkles from '../assets/stickers/sparkles.svg';
import stickerCatEars from '../assets/stickers/cat-ears.svg';
import stickerFire from '../assets/stickers/fire.svg';
import stickerSpeechBubble from '../assets/stickers/speech-bubble.svg';
import stickerPartyHat from '../assets/stickers/party-hat.svg';
import stickerRibbonBow from '../assets/stickers/ribbon-bow.svg';

export const FRAMES_CATALOG = [
  { id: 'vintage-gold', name: 'Vintage Gold', src: frameVintageGold },
  { id: 'vintage-classic', name: 'Vintage Classic', src: frameVintage },
  { id: 'neon-cyber', name: 'Neon Cyberpunk', src: frameNeonCyber },
  { id: 'floral-bloom', name: 'Floral Bloom', src: frameFloralBloom },
  { id: 'retro-film', name: 'Retro 35mm Film', src: frameRetroFilm },
  { id: 'cute-pastel', name: 'Cute Pastel', src: frameCutePastel },
  { id: 'birthday-party', name: 'Party Festival', src: frameBirthdayParty },
  { id: 'minimalist-black', name: 'Minimalist Black', src: frameMinimalistBlack },
  { id: 'comic-pop', name: 'Comic Pop Art', src: frameComicPop },
  { id: 'love-romance', name: 'Love & Romance', src: frameLoveRomance },
  { id: 'festive-sparkle', name: 'Festive Sparkle', src: frameFestiveSparkle },
  { id: 'y2k-chrome', name: 'Y2K Chrome', src: frameY2kChrome },
  { id: 'polaroid-cream', name: 'Polaroid Cream', src: framePolaroidCream }
];

const svgSticker = body =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">${body}</svg>`)}`;

const badgeSticker = (text, bg, stroke, color = '#ffffff') =>
  svgSticker(`
    <rect x="10" y="44" width="140" height="72" rx="36" fill="${bg}" stroke="${stroke}" stroke-width="6"/>
    <text x="80" y="90" font-family="sans-serif" font-size="28" font-weight="900" fill="${color}" text-anchor="middle">${text}</text>
  `);

export const STICKER_CATEGORIES = [
  { id: 'all', name: 'ทั้งหมด' },
  { id: 'pinned', name: '📌 ปักหมุด' },
  { id: 'coquette', name: '🎀 Coquette' },
  { id: 'y2k', name: '💿 Y2K / ฟิล์ม' },
  { id: 'words', name: '💬 คำฮิต' },
  { id: 'doodle', name: '✨ อีโมติคอน' }
];

export const STICKERS_CATALOG = [
  // Coquette / โบว์
  { id: 'ribbon-bow', name: 'Red Ribbon', category: 'coquette', src: stickerRibbonBow },
  { id: 'pink-coquette-bow', name: 'Pink Bow', category: 'coquette', src: svgSticker(`
    <path d="M80 78 C58 50, 22 44, 24 76 C26 102, 58 96, 80 82 C102 96, 134 102, 136 76 C138 44, 102 50, 80 78 Z" fill="#f9a8d4" stroke="#db2777" stroke-width="5"/>
    <path d="M76 84 L54 134 L70 124 L80 90 L90 124 L106 134 L84 84 Z" fill="#fbcfe8" stroke="#db2777" stroke-width="4"/>
    <circle cx="80" cy="80" r="12" fill="#f472b6" stroke="#db2777" stroke-width="4"/>
  `) },
  { id: 'cherry-sweet', name: 'Sweet Cherry', category: 'coquette', src: svgSticker(`
    <path d="M58 96 C62 56, 84 40, 100 30 C92 52, 98 74, 106 96" fill="none" stroke="#15803d" stroke-width="6" stroke-linecap="round"/>
    <ellipse cx="110" cy="40" rx="18" ry="10" transform="rotate(-25 110 40)" fill="#4ade80" stroke="#15803d" stroke-width="4"/>
    <circle cx="52" cy="110" r="24" fill="#f43f5e" stroke="#9f1239" stroke-width="5"/>
    <circle cx="106" cy="112" r="24" fill="#e11d48" stroke="#9f1239" stroke-width="5"/>
    <circle cx="44" cy="102" r="6" fill="#fff1f2"/>
    <circle cx="98" cy="104" r="6" fill="#fff1f2"/>
  `) },
  { id: 'butterfly-pastel', name: 'Butterfly', category: 'coquette', src: svgSticker(`
    <ellipse cx="48" cy="64" rx="30" ry="24" transform="rotate(-20 48 64)" fill="#c4b5fd" stroke="#7c3aed" stroke-width="4"/>
    <ellipse cx="112" cy="64" rx="30" ry="24" transform="rotate(20 112 64)" fill="#c4b5fd" stroke="#7c3aed" stroke-width="4"/>
    <ellipse cx="56" cy="104" rx="22" ry="18" transform="rotate(15 56 104)" fill="#f9a8d4" stroke="#7c3aed" stroke-width="4"/>
    <ellipse cx="104" cy="104" rx="22" ry="18" transform="rotate(-15 104 104)" fill="#f9a8d4" stroke="#7c3aed" stroke-width="4"/>
    <rect x="74" y="48" width="12" height="66" rx="6" fill="#5b21b6"/>
  `) },
  { id: 'heart', name: 'Heart', category: 'coquette', src: stickerHeart },

  // Y2K / ฟิล์ม
  { id: 'sunglasses', name: 'Cool Glasses', category: 'y2k', src: stickerSunglasses },
  { id: 'y2k-cd', name: 'Y2K Disc', category: 'y2k', src: svgSticker(`
    <defs><linearGradient id="cdg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#bae6fd"/><stop offset="50%" stop-color="#e9d5ff"/><stop offset="100%" stop-color="#fbcfe8"/></linearGradient></defs>
    <circle cx="80" cy="80" r="62" fill="url(#cdg)" stroke="#64748b" stroke-width="5"/>
    <circle cx="80" cy="80" r="20" fill="#ffffff" stroke="#64748b" stroke-width="5"/>
    <path d="M38 42 L68 68 M92 92 L122 118" stroke="#ffffff" stroke-width="8" stroke-linecap="round" opacity="0.7"/>
  `) },
  { id: 'retro-cam', name: 'Film Cam', category: 'y2k', src: svgSticker(`
    <rect x="20" y="48" width="120" height="80" rx="16" fill="#1e293b" stroke="#94a3b8" stroke-width="5"/>
    <rect x="46" y="34" width="36" height="18" rx="6" fill="#475569"/>
    <circle cx="82" cy="88" r="24" fill="#38bdf8" stroke="#e2e8f0" stroke-width="6"/>
    <circle cx="75" cy="81" r="6" fill="#ffffff"/>
    <circle cx="118" cy="64" r="6" fill="#f43f5e"/>
  `) },
  { id: 'y2k-chrome-star', name: 'Chrome Star', category: 'y2k', src: svgSticker(`
    <defs><linearGradient id="ysg" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#f8fafc"/><stop offset="50%" stop-color="#a5b4fc"/><stop offset="100%" stop-color="#f472b6"/></linearGradient></defs>
    <polygon points="80,14 96,62 146,80 96,98 80,146 64,98 14,80 64,62" fill="url(#ysg)" stroke="#4f46e5" stroke-width="5" stroke-linejoin="round"/>
  `) },
  { id: 'film-strip-tag', name: '35mm Film', category: 'y2k', src: svgSticker(`
    <rect x="22" y="36" width="116" height="88" rx="10" fill="#18181b" stroke="#facc15" stroke-width="5"/>
    <rect x="34" y="44" width="14" height="10" rx="2" fill="#ffffff"/>
    <rect x="73" y="44" width="14" height="10" rx="2" fill="#ffffff"/>
    <rect x="112" y="44" width="14" height="10" rx="2" fill="#ffffff"/>
    <rect x="34" y="106" width="14" height="10" rx="2" fill="#ffffff"/>
    <rect x="73" y="106" width="14" height="10" rx="2" fill="#ffffff"/>
    <rect x="112" y="106" width="14" height="10" rx="2" fill="#ffffff"/>
    <text x="80" y="87" font-family="monospace" font-size="22" font-weight="900" fill="#facc15" text-anchor="middle">35MM</text>
  `) },

  // ข้อความ / คำฮิต
  { id: 'speech-bubble', name: 'Snap Bubble', category: 'words', src: stickerSpeechBubble },
  { id: 'word-bestie', name: 'BESTIE', category: 'words', src: badgeSticker('BESTIE ♡', '#ec4899', '#831843') },
  { id: 'word-socute', name: 'SO CUTE', category: 'words', src: badgeSticker('SO CUTE!', '#a855f7', '#581c87') },
  { id: 'word-loveu', name: 'LOVE U', category: 'words', src: badgeSticker('LOVE U', '#f43f5e', '#881337') },
  { id: 'word-vibe', name: 'GOOD VIBE', category: 'words', src: badgeSticker('VIBE ✨', '#0ea5e9', '#0c4a6e') },
  { id: 'word-omg', name: 'OMG!', category: 'words', src: badgeSticker('OMG!!', '#facc15', '#18181b', '#18181b') },

  // อีโมติคอน / วาดมือ
  { id: 'star', name: 'Star', category: 'doodle', src: stickerStar },
  { id: 'crown', name: 'Crown', category: 'doodle', src: stickerCrown },
  { id: 'sparkles', name: 'Magic Sparkles', category: 'doodle', src: stickerSparkles },
  { id: 'cat-ears', name: 'Cat Ears', category: 'doodle', src: stickerCatEars },
  { id: 'fire', name: 'Lit Fire', category: 'doodle', src: stickerFire },
  { id: 'party-hat', name: 'Party Hat', category: 'doodle', src: stickerPartyHat },
  { id: 'doodle-smiley', name: 'Happy Smile', category: 'doodle', src: svgSticker(`
    <circle cx="80" cy="80" r="56" fill="#fde047" stroke="#ca8a04" stroke-width="6"/>
    <circle cx="60" cy="68" r="7" fill="#1e293b"/>
    <circle cx="100" cy="68" r="7" fill="#1e293b"/>
    <circle cx="48" cy="84" r="9" fill="#fb7185" opacity="0.6"/>
    <circle cx="112" cy="84" r="9" fill="#fb7185" opacity="0.6"/>
    <path d="M56 92 Q80 116 104 92" fill="none" stroke="#1e293b" stroke-width="7" stroke-linecap="round"/>
  `) },
  { id: 'doodle-music', name: 'Music Note', category: 'doodle', src: svgSticker(`
    <path d="M62 114 L62 42 L122 30 L122 98" fill="none" stroke="#ec4899" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <ellipse cx="48" cy="116" rx="18" ry="13" fill="#ec4899"/>
    <ellipse cx="108" cy="100" rx="18" ry="13" fill="#a855f7"/>
  `) }
];

export const FILTERS_CATALOG = [
  { id: 'classic', name: 'Classic', css: 'none', class: 'swatch-classic' },
  { id: 'sunlit', name: 'Sunlit', css: 'sepia(0.35) saturate(1.4) brightness(1.05)', class: 'swatch-sunlit' },
  { id: 'frost', name: 'Frost', css: 'hue-rotate(180deg) saturate(1.2) brightness(1.1)', class: 'swatch-frost' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.2) brightness(0.95)', class: 'swatch-noir' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.8) contrast(1.1)', class: 'swatch-vivid' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)', class: 'swatch-warm' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.5) contrast(1.15) brightness(0.9)', class: 'swatch-vintage' },
  { id: 'rose', name: 'Rose Glow', css: 'sepia(0.18) saturate(1.25) brightness(1.06) hue-rotate(-18deg)', class: 'swatch-rose' },
  { id: 'mint', name: 'Cool Mint', css: 'hue-rotate(25deg) saturate(1.15) brightness(1.06)', class: 'swatch-mint' },
  { id: 'film', name: 'Analog Film', css: 'contrast(1.18) saturate(0.85) sepia(0.22) brightness(0.98)', class: 'swatch-film' },
  { id: 'soft-bw', name: 'Soft B&W', css: 'grayscale(1) contrast(0.95) brightness(1.08)', class: 'swatch-soft-bw' },
  { id: 'dreamy', name: 'Dreamy', css: 'brightness(1.12) contrast(0.92) saturate(1.3)', class: 'swatch-dreamy' }
];

