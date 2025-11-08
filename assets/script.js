// [script.js] (API連携 + ランダム配置UI 統合版)
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. APIとDOMの基本設定 ---
    // APIサーバーのURL (開発時は uvicorn の起動ポートに合わせてください)
    // 注意: フロントを `http://localhost:8000` で立ち上げている場合、
    // `http://127.0.0.1:8000` 宛の fetch はローカルの静的ファイルサーバに届き
    // 404/クロスオリジンエラーになることがあります。uvicorn が 8001 で起動
    // しているなら下のように設定してください。
    const API_URL = 'http://127.0.0.1:8001'; // ⬅️ 必要に応じてポートを変更

    const postButton = document.getElementById('postButton');
    const reloadButton = document.getElementById('reloadButton');
    const overlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelPost');
    const form = document.getElementById('postForm');
    const posts = document.getElementById('posts');

    const viewOverlay = document.getElementById('viewOverlay');
    const viewClose = document.getElementById('viewClose');
    const viewNick = document.getElementById('viewNick');
    const viewBodyText = document.getElementById('viewBodyText');
    const viewRating = document.getElementById('viewRating');
    const viewLike = document.getElementById('viewLike');
    const viewLikeCount = document.getElementById('viewLikeCount');
    const viewDelete = document.getElementById('viewDelete'); // 削除ボタン

    let currentViewedPostId = null;

    // --- 2. ランダム配置ロジック ---
    function rectsOverlap(a, b) {
        return !(a.left + a.width <= b.left ||
                 b.left + b.width <= a.left ||
                 a.top + a.height <= b.top ||
                 b.top + b.height <= a.top);
    }

    function generatePresetPositions(count = 10) {
        if (!posts) return [];
        const stageW = posts.clientWidth || Math.max(window.innerWidth - 20, 200);
        const stageH = posts.clientHeight || Math.max(window.innerHeight - 20, 200);
        const positions = [];
        const baseline = 120;
        const minW = baseline * 2;
        const maxW = baseline * 5;
        let attempts = 0;
        const maxAttempts = 2000;
        while (positions.length < count && attempts < maxAttempts) {
            attempts++;
            const w = Math.floor(Math.random() * (maxW - minW + 1)) + minW;
            const h = Math.round(w * 0.75);
            if (w >= stageW || h >= stageH) continue;
            const maxLeft = Math.max(0, stageW - w);
            const maxTop = Math.max(0, stageH - h);
            const left = Math.floor(Math.random() * (maxLeft + 1));
            const top = Math.floor(Math.random() * (maxTop + 1));
            const candidate = { left, top, width: w, height: h };
            if (!positions.some(ex => rectsOverlap(candidate, ex))) {
                positions.push(candidate);
            }
        }
        return positions;
    }

    if (!window.PRESET_POSITIONS || !Array.isArray(window.PRESET_POSITIONS) || window.PRESET_POSITIONS.length === 0) {
        window.PRESET_POSITIONS = generatePresetPositions(10);
    }

    function applyRandomPosition(wrapper, img) {
        function place() {
            if (!posts) return;
            const stageW = posts.clientWidth;
            const stageH = posts.clientHeight;
            const imgW = img.offsetWidth || 240;
            const imgH = img.offsetHeight || 180;

            const maxLeft = Math.max(0, stageW - imgW);
            const maxTop = Math.max(0, stageH - imgH);

            let left = null, top = null;
            if (window.PRESET_POSITIONS && window.PRESET_POSITIONS.length > 0) {
                const p = window.PRESET_POSITIONS.shift();
                if (p) {
                    left = p.left;
                    top = p.top;
                    try { img.style.width = (Number(p.width) || imgW) + 'px'; } catch (e) {}
                }
            }
            if (left == null) left = Math.floor(Math.random() * (maxLeft + 1));
            if (top == null) top = Math.floor(Math.random() * (maxTop + 1));

            wrapper.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
            wrapper.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
        }

        if (img.complete && img.naturalWidth) {
            place();
        } else {
            img.addEventListener('load', place);
            setTimeout(place, 300);
        }
    }

    // --- 3. 投稿をDOMに追加 ---
    function addPostToDOM(post) {
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
        img.alt = `${escapeHtml(post.name)}さんの投稿画像`;

        img.dataset.postId = post.post_id;
        img.dataset.likes = post.like_count;
        img.dataset.nick = post.name;
        img.dataset.content = post.content;
        img.dataset.rating = post.parm_unluckey;

        const wrapper = document.createElement('div');
        wrapper.className = 'post';
        wrapper.style.position = 'absolute';
        wrapper.appendChild(img);
        posts.appendChild(wrapper);

        applyRandomPosition(wrapper, img);
    }

    // --- 4. モーダル操作 ---
    function openModal() {
        overlay.classList.remove('hidden');
        overlay.hidden = false;
        overlay.setAttribute('aria-hidden', 'false');
        document.getElementById('nickname').focus();
    }

    function closeModal() {
        overlay.classList.add('hidden');
        overlay.hidden = true;
        overlay.setAttribute('aria-hidden', 'true');
        form.reset();
        postButton.focus();
    }

    if (postButton) postButton.addEventListener('click', openModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });

    // --- 5. 投稿送信 (API連携) ---
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nick = document.getElementById('nickname').value.trim();
            const content = document.getElementById('content').value.trim();
            const rating = document.getElementById('rating').value;
            if (!nick || !content) {
                alert('ニックネームと投稿内容を入力してください。');
                return;
            }

            const postData = {
                name: nick,
                content: content,
                parm_unluckey: parseInt(rating, 10)
            };

            try {
                const response = await fetch(`${API_URL}/posts/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData),
                });
                if (!response.ok) throw new Error('投稿に失敗しました。');

                const newPost = await response.json();
                addPostToDOM(newPost);
                closeModal();

            } catch (error) {
                console.error('投稿エラー:', error);
                alert(error.message);
            }
        });
    }

    // --- 6. 閲覧モーダル ---
    function openView(dataset) {
        if (!viewOverlay) return;
        viewNick.textContent = dataset.nick || '';
        viewBodyText.textContent = dataset.content || '';
        viewRating.textContent = dataset.rating || '';
        viewLikeCount.textContent = dataset.likes || '0';
        currentViewedPostId = dataset.postId || null;

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

    if (viewClose) viewClose.addEventListener('click', closeView);
    if (viewOverlay) viewOverlay.addEventListener('click', e => { if (e.target === viewOverlay) closeView(); });

    if (posts) {
        posts.addEventListener('click', (e) => {
            const img = e.target.closest && e.target.closest('img.post-image');
            if (img) openView(img.dataset);
        });
    }

    // --- 7. いいね・削除機能 (API連携) ---
    if (viewLike) {
        viewLike.addEventListener('click', async () => {
            if (!currentViewedPostId) return;
            try {
                const response = await fetch(`${API_URL}/posts/${currentViewedPostId}/like`, { method: 'PUT' });
                if (!response.ok) throw new Error('いいねに失敗');
                const updatedPost = await response.json();

                viewLikeCount.textContent = updatedPost.like_count;
                const imgEl = document.querySelector(`img.post-image[data-post-id="${currentViewedPostId}"]`);
                if (imgEl) imgEl.dataset.likes = updatedPost.like_count;

                viewLike.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 220 });
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }

    if (viewDelete) {
        viewDelete.addEventListener('click', async () => {
            if (!currentViewedPostId) return;
            if (!confirm('この投稿を削除しますか？')) return;

            try {
                const response = await fetch(`${API_URL}/posts/${currentViewedPostId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('削除に失敗');

                const imgEl = document.querySelector(`img.post-image[data-post-id="${currentViewedPostId}"]`);
                if (imgEl) imgEl.closest('.post').remove();
                closeView();
            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }

    // --- 8. リロード・ESCキー対応 ---
    if (reloadButton) reloadButton.addEventListener('click', () => window.location.reload());

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (overlay && !overlay.classList.contains('hidden')) closeModal();
            if (viewOverlay && !viewOverlay.classList.contains('hidden')) closeView();
        }
    });

    // --- 9. ユーティリティ・初期化 ---
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, (s) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }

    async function initializeApp() {
        try {
            const response = await fetch(`${API_URL}/posts/`);
            if (!response.ok) throw new Error('サーバーから投稿を取得できませんでした。');
            const existingPosts = await response.json();
            posts.innerHTML = '';
            existingPosts.forEach(post => addPostToDOM(post));
        } catch (error) {
            console.error('初期化エラー:', error);
            posts.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    initializeApp();
});
