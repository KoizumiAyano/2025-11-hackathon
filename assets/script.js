document.addEventListener('DOMContentLoaded', () => {
	const postButton = document.getElementById('postButton');
	const reloadButton = document.getElementById('reloadButton');
	const overlay = document.getElementById('modalOverlay');
	const cancelBtn = document.getElementById('cancelPost');
	const form = document.getElementById('postForm');
	const posts = document.getElementById('posts');

		// ページが PRESET_POSITIONS を提供しない場合、重複しにくい座標を約10個生成し、
		// window.PRESET_POSITIONS に格納して配置ロジックで利用できるようにする。
		function rectsOverlap(a, b) {
			return !(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
		}

		function generatePresetPositions(count = 10) {
			if (!posts) return [];
			const stageW = posts.clientWidth || Math.max(window.innerWidth - 20, 200);
			const stageH = posts.clientHeight || Math.max(window.innerHeight - 20, 200);
			const positions = [];
			const baseline = 120;
			const minW = baseline * 2; // 最小幅 240px
			const maxW = baseline * 5; // 最大幅 600px
			let attempts = 0;
			const maxAttempts = 2000;
			while (positions.length < count && attempts < maxAttempts) {
				attempts++;
				const w = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
				const h = Math.round(w * 0.75);
				if (w >= stageW || h >= stageH) continue; // ステージに収まらない場合はスキップ
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

	// リロードボタン: 単純にページを再読み込み
	if (reloadButton) {
		reloadButton.addEventListener('click', () => {
			// 可能ならフォーカスやARIAを保ってから再読み込みする
			try { reloadButton.disabled = true; } catch (e) {}
			window.location.reload();
		});
	}

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

			// 投稿サムネイルに使う画像を src/image/ からランダム選択する
			// プロジェクト内の全ての花画像を含むように更新済み
			const IMAGES = [
				'src/image/gerbera.png',
				'src/image/lily.png',
				'src/image/margaret.png',
				'src/image/rose.png',
				'src/image/sunflower.png',
				'src/image/sweetpee.png'
			];
			const img = document.createElement('img');
			img.className = 'post-image';
			img.src = IMAGES[Math.floor(Math.random() * IMAGES.length)];
			img.alt = `${nick}さんの投稿画像`;
			// ビュー用モーダルが参照できるよう、投稿に一意のIDを付与する
			const pid = 'post-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
			img.dataset.postId = pid;
			img.dataset.likes = '0';
			img.dataset.nick = nick;
			img.dataset.content = content;
			img.dataset.rating = rating;

			// 基準幅（約120px）の2倍〜5倍の範囲でランダムに幅を設定する
			const baseline = 120;
			const minW = baseline * 2; // 最小幅 240px
			const maxW = baseline * 5; // 最大幅 600px
			const rndW = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
			img.style.width = rndW + 'px';
			img.style.height = 'auto';

			const wrapper = document.createElement('div');
			wrapper.className = 'post';
			wrapper.style.position = 'absolute';
			// 先に追加してレイアウトに参加させ、サイズ計測ができるようにする
			if (posts) posts.appendChild(wrapper);
			wrapper.appendChild(img);

			// 画像の読み込みを待ってレンダリング後のサイズを計測し、配置位置を算出する
			function placeImage() {
				if (!posts) return;
				const stageW = posts.clientWidth;
				const stageH = posts.clientHeight;
				const imgW = img.offsetWidth || img.naturalWidth || rndW;
				const imgH = img.offsetHeight || img.naturalHeight || Math.round(imgW * 0.75);

				const maxLeft = Math.max(0, stageW - imgW);
				const maxTop = Math.max(0, stageH - imgH);

				// 補助: ユーザー提供の座標値を解決する
				// サポートするフォーマット:
				//  - 数値が 1 以上: ピクセル指定
				//  - 0〜1 の数値: 使用可能範囲に対する割合（0..max）
				//  - '%' を含む文字列: ステージに対するパーセンテージ（例: '10%'）
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
						// ピクセル指定として扱う
						return Math.round(Math.min(Math.max(0, val), max));
					}
					return null;
				}

				// ページが `window.PRESET_POSITIONS` 配列を提供する場合、先頭の座標オブジェクトを取り出して left/top に使います。
				// サポートするキー: left/top または x/y
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
									try { img.style.width = (Number(p.width) || 0) + 'px'; } catch (e) { /* 無視 */ }
								}
								left = resolveCoord(rawLeft, maxLeft);
								top = resolveCoord(rawTop, maxTop);
							}
						}
				} catch (e) {
					// 例外が発生した場合は無視してランダム配置へフォールバック
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

	// 投稿画像をクリックすると、その投稿内容を表示するビュー用モーダルを開く
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

	// いいねボタンのハンドラ — currentViewedPostId を参照して処理する
	if (viewLike) {
		viewLike.addEventListener('click', () => {
			if (!currentViewedPostId) return;
			const el = document.querySelector('img.post-image[data-post-id="' + currentViewedPostId + '"]');
			if (!el) return;
			const prev = Number(el.dataset.likes || 0) || 0;
			const next = prev + 1;
			el.dataset.likes = String(next);
			if (viewLikeCount) viewLikeCount.textContent = String(next);
			// 視覚的なフィードバック（任意）
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

	// 注: 画像は `src/image/` の静的ファイルから取得するようになったため、SVG ジェネレータは不要

	function escapeHtml(str) {
		return str.replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
	}
});

