/** Characters players can pick when joining. Emoji render natively on phones and laptops, so no assets are needed offline. */
export const AVATARS = [
  '🦁', '🐯', '🐼', '🦊', '🐸', '🐵', '🐧', '🦉',
  '🐙', '🦄', '🐢', '🐘', '🦒', '🦓', '🐬', '🦋',
  '🐝', '🦖', '🐨', '🐰', '🐻', '🦜', '🧑‍🚀', '🤖',
];

export function randomAvatar(): string {
  return AVATARS[Math.floor(Math.random() * AVATARS.length)];
}
