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
  { id: 'festive-sparkle', name: 'Festive Sparkle', src: frameFestiveSparkle }
];

export const STICKERS_CATALOG = [
  { id: 'star', name: 'Star', src: stickerStar },
  { id: 'heart', name: 'Heart', src: stickerHeart },
  { id: 'crown', name: 'Crown', src: stickerCrown },
  { id: 'sunglasses', name: 'Cool Glasses', src: stickerSunglasses },
  { id: 'sparkles', name: 'Magic Sparkles', src: stickerSparkles },
  { id: 'cat-ears', name: 'Cat Ears', src: stickerCatEars },
  { id: 'fire', name: 'Lit Fire', src: stickerFire },
  { id: 'speech-bubble', name: 'Snap Bubble', src: stickerSpeechBubble },
  { id: 'party-hat', name: 'Party Hat', src: stickerPartyHat },
  { id: 'ribbon-bow', name: 'Red Ribbon', src: stickerRibbonBow }
];

export const FILTERS_CATALOG = [
  { id: 'classic', name: 'Classic', css: 'none', class: 'swatch-classic' },
  { id: 'sunlit', name: 'Sunlit', css: 'sepia(0.35) saturate(1.4) brightness(1.05)', class: 'swatch-sunlit' },
  { id: 'frost', name: 'Frost', css: 'hue-rotate(180deg) saturate(1.2) brightness(1.1)', class: 'swatch-frost' },
  { id: 'noir', name: 'Noir', css: 'grayscale(1) contrast(1.2) brightness(0.95)', class: 'swatch-noir' },
  { id: 'vivid', name: 'Vivid', css: 'saturate(1.8) contrast(1.1)', class: 'swatch-vivid' },
  { id: 'warm', name: 'Warm', css: 'sepia(0.2) saturate(1.3) hue-rotate(-10deg)', class: 'swatch-warm' },
  { id: 'vintage', name: 'Vintage', css: 'sepia(0.5) contrast(1.15) brightness(0.9)', class: 'swatch-vintage' }
];

