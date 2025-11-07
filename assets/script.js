document.addEventListener('DOMContentLoaded', () => {
	const postButton = document.getElementById('postButton');
	const overlay = document.getElementById('modalOverlay');
	const cancelBtn = document.getElementById('cancelPost');
	const form = document.getElementById('postForm');
	const posts = document.getElementById('posts');

	function openModal() {
		overlay.classList.remove('hidden');
		overlay.hidden = false;
		overlay.setAttribute('aria-hidden', 'false');
		const nickInput = document.getElementById('nickname');
		if (nickInput) nickInput.focus();
	}

	function closeModal() {
		overlay.classList.add('hidden');
		overlay.hidden = true;
		overlay.setAttribute('aria-hidden', 'true');
		if (form) form.reset();
		if (postButton) postButton.focus();
	}

	if (postButton) postButton.addEventListener('click', openModal);
	if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

	if (overlay) {
		overlay.addEventListener('click', (e) => {
			if (e.target === overlay) closeModal();
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
			closeModal();
		}
	});

	if (form) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const nick = document.getElementById('nickname').value.trim();
			const content = document.getElementById('content').value.trim();
			const rating = document.getElementById('rating').value;
			if (!nick || !content) {
				alert('ニックネームと投稿内容を入力してください。');
				return;
			}
			const postEl = document.createElement('article');
			postEl.className = 'post';
			postEl.innerHTML = `\n        <div class="meta"><span class="nick">${escapeHtml(nick)}</span> ・ <span class="rating">評価: ${escapeHtml(rating)}</span></div>\n        <div class="body">${escapeHtml(content)}</div>\n      `;
			if (posts) posts.prepend(postEl);
			closeModal();
		});
	}

	function escapeHtml(str) {
		return str.replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
	}
});

