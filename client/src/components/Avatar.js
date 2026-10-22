// Animal avatars — no photos, no external services, works offline.
// The User model just stores the animal's key (e.g. "lion") in `avatar`.

const AVATARS = {
  bird: { emoji: '🐦', bg: '#dbeafe' },
  lion: { emoji: '🦁', bg: '#fef3c7' },
  fox: { emoji: '🦊', bg: '#ffedd5' },
  panda: { emoji: '🐼', bg: '#e5e7eb' },
  frog: { emoji: '🐸', bg: '#dcfce7' },
  cat: { emoji: '🐱', bg: '#fce7f3' },
  dog: { emoji: '🐶', bg: '#fee2e2' },
  turtle: { emoji: '🐢', bg: '#ccfbf1' },
  owl: { emoji: '🦉', bg: '#ede9fe' },
  penguin: { emoji: '🐧', bg: '#e0f2fe' },
};

export const AVATAR_KEYS = Object.keys(AVATARS);

function Avatar({ avatar, size = 36 }) {
  const a = AVATARS[avatar] || { emoji: '👤', bg: '#e4e6eb' };
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.55), background: a.bg }}
    >
      {a.emoji}
    </span>
  );
}

export default Avatar;
