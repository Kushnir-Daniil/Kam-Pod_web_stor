const DEFAULT_STORIES = [];

export function getStories() {
  const stored = localStorage.getItem("stories");
  if (!stored) {
    localStorage.setItem("stories", JSON.stringify(DEFAULT_STORIES));
    return DEFAULT_STORIES;
  }
  return JSON.parse(stored);
}

export function saveStories(stories) {
  localStorage.setItem("stories", JSON.stringify(stories));
}

export function addStory(story) {
  const stories = getStories();
  story.id = stories.length ? Math.max(...stories.map(s => s.id)) + 1 : 1;
  story.content = null; // поле під майбутнє наповнення (комікс/казка/гра)
  stories.push(story);
  saveStories(stories);
  return stories;
}