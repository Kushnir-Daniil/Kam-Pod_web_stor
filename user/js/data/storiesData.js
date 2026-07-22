const DEFAULT_STORIES = [
  {
    id: 1,
    title: "Таємниці Папської вежі",
    type: "Комікс",
    duration: "15 хв",
    description: "Допоможи драконичу знайти давню книгу знань і відкрити секрети найвищої вежі фортеці.",
    image: "quest1.jpg",
    status: "active",
    progress: 60,
    content: null // сюди пізніше піде структура комікс/казка/гра, коли буде дизайн
  },
  // інші історії аналогічно, content: null
];

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
  story.content = null; // поле під майбутнє наповнення
  stories.push(story);
  saveStories(stories);
  return stories;
}