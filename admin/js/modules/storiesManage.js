export function initStoriesManage() {
  console.log("Управління історіями завантажено");
  // логіка додавання/редагування історій
}

export function renderStoryCard(story) {
  return `
    <div class="story-card">
      <img src="/img/${story.cover}" alt="${story.title}">
      <h3>${story.title}</h3>
    </div>
  `;
}