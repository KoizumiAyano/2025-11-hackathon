document.addEventListener('DOMContentLoaded', () => {
	const postButton = document.getElementById('postButton');
	const overlay = document.getElementById('modalOverlay');
	const cancelBtn = document.getElementById('cancelPost');
	const form = document.getElementById('postForm');
	const posts = document.getElementById('posts');

		// If the page does not provide PRESET_POSITIONS, generate ~10 non-overlapping
		// positions (left/top/width/height in pixels) and expose them as
		// window.PRESET_POSITIONS so the placement logic can consume them.
		function rectsOverlap(a, b) {
			return !(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
		}

		function generatePresetPositions(count = 10) {
			if (!posts) return [];
			const stageW = posts.clientWidth || Math.max(window.innerWidth - 20, 200);
			const stageH = posts.clientHeight || Math.max(window.innerHeight - 20, 200);
			const positions = [];
			const baseline = 120;
			const minW = baseline * 2; // 240
			const maxW = baseline * 5; // 600
			let attempts = 0;
			const maxAttempts = 2000;
			while (positions.length < count && attempts < maxAttempts) {
				attempts++;
				const w = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
				const h = Math.round(w * 0.75);
				if (w >= stageW || h >= stageH) continue; // too big for stage
				const maxLeft = Math.max(0, stageW - w);
				const maxTop = Math.max(0, stageH - h);
				const left = Math.floor(Math.random() * (maxLeft + 1));
				const top = Math.floor(Math.random() * (maxTop + 1));
				const candidate = { left, top, width: w, height: h };
				let ok = true;
				for (const ex of positions) {
					if (rectsOverlap(candidate, ex)) { ok = false; break; }
				}
				if (ok) positions.push(candidate);
			}
			return positions;
		}

		if (!window.PRESET_POSITIONS || !Array.isArray(window.PRESET_POSITIONS) || window.PRESET_POSITIONS.length === 0) {
			window.PRESET_POSITIONS = generatePresetPositions(10);
		}
	const viewOverlay = document.getElementById('viewOverlay');
	const viewClose = document.getElementById('viewClose');
	const viewNick = document.getElementById('viewNick');
	const viewBodyText = document.getElementById('viewBodyText');
	const viewRating = document.getElementById('viewRating');
	const viewLike = document.getElementById('viewLike');
	const viewLikeCount = document.getElementById('viewLikeCount');
	let currentViewedPostId = null;

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

			// pick a random image from src/image/ to use as the post thumbnail
			const IMAGES = [
				'src/image/sunflower.png',
			];
			const img = document.createElement('img');
			img.className = 'post-image';
			img.src = IMAGES[Math.floor(Math.random() * IMAGES.length)];
			img.alt = `${nick}さんの投稿画像`;
			// unique id for this post so view modal can reference it
			const pid = 'post-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
			img.dataset.postId = pid;
			img.dataset.likes = '0';
			img.dataset.nick = nick;
			img.dataset.content = content;
			img.dataset.rating = rating;

			// set a random width between 2x and 5x of the previous baseline (baseline ~120px)
			const baseline = 120;
			const minW = baseline * 2; // 240px
			const maxW = baseline * 5; // 600px
			const rndW = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
			img.style.width = rndW + 'px';
			img.style.height = 'auto';

			const wrapper = document.createElement('div');
			wrapper.className = 'post';
			wrapper.style.position = 'absolute';
			// append first so it participates in layout and we can measure sizes
			if (posts) posts.appendChild(wrapper);
			wrapper.appendChild(img);

			// Wait for image to load so we can calculate its rendered size for positioning
			function placeImage() {
				if (!posts) return;
				const stageW = posts.clientWidth;
				const stageH = posts.clientHeight;
				const imgW = img.offsetWidth || img.naturalWidth || rndW;
				const imgH = img.offsetHeight || img.naturalHeight || Math.round(imgW * 0.75);

				const maxLeft = Math.max(0, stageW - imgW);
				const maxTop = Math.max(0, stageH - imgH);

				// Helper: resolve a coordinate value provided by the user.
				// Supported formats:
				//  - number >= 1 : pixels
				//  - number between 0 and 1 : fraction of available range (0..max)
				//  - string with '%' : percentage of stage (e.g. '10%')
				function resolveCoord(val, max) {
					if (val == null) return null;
					if (typeof val === 'string' && val.trim().endsWith('%')) {
						const pct = parseFloat(val) / 100;
						if (isNaN(pct)) return null;
						return Math.round(pct * max);
					}
					if (typeof val === 'number') {
						if (val >= 0 && val <= 1) {
							return Math.round(val * max);
						}
						// treat as pixels
						return Math.round(Math.min(Math.max(0, val), max));
					}
					return null;
				}

				// If the page provides an array `window.PRESET_POSITIONS`, consume the next
				// coordinate object and use it as left/top. Supported keys: left/top or x/y.
				let left = null;
				let top = null;
				try {
						if (window && Array.isArray(window.PRESET_POSITIONS) && window.PRESET_POSITIONS.length > 0) {
							const p = window.PRESET_POSITIONS.shift();
							if (p) {
								const rawLeft = p.left != null ? p.left : (p.x != null ? p.x : null);
								const rawTop = p.top != null ? p.top : (p.y != null ? p.y : null);
								// if the preset includes a width, apply it so measurement matches generation
								if (p.width != null) {
									try { img.style.width = (Number(p.width) || 0) + 'px'; } catch (e) { /* ignore */ }
								}
								left = resolveCoord(rawLeft, maxLeft);
								top = resolveCoord(rawTop, maxTop);
							}
						}
				} catch (e) {
					// ignore and fallback to random
				}

				if (left == null) {
					left = Math.floor(Math.random() * (maxLeft + 1));
				}
				if (top == null) {
					top = Math.floor(Math.random() * (maxTop + 1));
				}

				// final clamp
				left = Math.min(Math.max(0, left), maxLeft);
				top = Math.min(Math.max(0, top), maxTop);

				wrapper.style.left = left + 'px';
				wrapper.style.top = top + 'px';
			}

			if (img.complete && img.naturalWidth) {
				placeImage();
			} else {
				img.addEventListener('load', placeImage);
				// fallback: after a short delay, try placing anyway
				setTimeout(placeImage, 300);
			}

			closeModal();
		});
	}

	// Clicking a post image opens the view modal with the content
	if (posts) {
		posts.addEventListener('click', (e) => {
			const img = e.target.closest && e.target.closest('img.post-image');
			if (img) {
				openView(img.dataset.nick, img.dataset.content, img.dataset.rating, img.dataset.postId);
			}
		});
	}

	if (viewClose) viewClose.addEventListener('click', closeView);

	if (viewOverlay) {
		viewOverlay.addEventListener('click', (e) => {
			if (e.target === viewOverlay) closeView();
		});
	}

	// Like button handler — single listener reads currentViewedPostId
	if (viewLike) {
		viewLike.addEventListener('click', () => {
			if (!currentViewedPostId) return;
			const el = document.querySelector('img.post-image[data-post-id="' + currentViewedPostId + '"]');
			if (!el) return;
			const prev = Number(el.dataset.likes || 0) || 0;
			const next = prev + 1;
			el.dataset.likes = String(next);
			if (viewLikeCount) viewLikeCount.textContent = String(next);
			// optional visual feedback
			viewLike.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 220 });
		});
	}

	document.addEventListener('keydown', (e) => {
		if (e.key === 'Escape' && viewOverlay && !viewOverlay.classList.contains('hidden')) {
			closeView();
		}
	});

	function openView(nick, content, rating, postId) {
		if (!viewOverlay) return;
		viewNick.textContent = nick || '';
		viewBodyText.textContent = content || '';
		viewRating.textContent = rating || '';
		// set like count from the original post element
		currentViewedPostId = postId || null;
		if (viewLikeCount) {
			let count = 0;
			try {
				const el = document.querySelector('img.post-image[data-post-id="' + currentViewedPostId + '"]');
				if (el && el.dataset && el.dataset.likes != null) count = Number(el.dataset.likes) || 0;
			} catch (e) { count = 0; }
			viewLikeCount.textContent = String(count);
		}
		// view modal shows only text fields (nick, content, rating) — no image
		viewOverlay.classList.remove('hidden');
		viewOverlay.hidden = false;
		viewOverlay.setAttribute('aria-hidden', 'false');
	}

	function closeView() {
		if (!viewOverlay) return;
		viewOverlay.classList.add('hidden');
		viewOverlay.hidden = true;
		viewOverlay.setAttribute('aria-hidden', 'true');
		currentViewedPostId = null;
	}

	// NOTE: images now come from static files under src/image/, so no SVG generator is needed

	function escapeHtml(str) {
		return str.replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
	}
});

