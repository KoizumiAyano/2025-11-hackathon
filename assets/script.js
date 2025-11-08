// [script.js] (API連携 + ランダム配置UI 統合版)
document.addEventListener('DOMContentLoaded', () => {
    console.log('[script] DOMContentLoaded fired');
    // --- 1. APIとDOMの基本設定 ---
    // APIサーバーのURL (開発時は uvicorn の起動ポートに合わせてください)
    // 注意: フロントを `http://localhost:8000` で立ち上げている場合、
    // `http://127.0.0.1:8000` 宛の fetch はローカルの静的ファイルサーバに届き
    // 404/クロスオリジンエラーになることがあります。uvicorn が 8001 で起動
    // しているなら下のように設定してください。
    const API_URL = 'http://127.0.0.1:8001'; // ⬅️ 必要に応じてポートを変更
    // 画像の最大幅（px）を指定。これを超えないようにキャップします。
    const MAX_IMG_WIDTH = 500;

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
    console.log('[script] elements:', { postButton, overlay, cancelBtn, form, posts });

    // --- 2. ランダム配置ロジック ---
    function rectsOverlap(a, b) {
        return !(a.left + a.width <= b.left ||
                 b.left + b.width <= a.left ||
                 a.top + a.height <= b.top ||
                 b.top + b.height <= a.top);
    }

    function generatePresetPositions(count = 10, forMobile = false) {
        // 非ランダム: グリッドレイアウトで位置を決める
        // 背景のランダム配置を一旦止めたい場合に使う。画像のサイズは個別に決められるため
        // グリッドセルに合わせて left/top を割り当てる。
        if (!posts) return [];
        const stageW = posts.clientWidth || Math.max(window.innerWidth - 20, 200);
        const stageH = posts.clientHeight || Math.max(window.innerHeight - 20, 200);
        const positions = [];

        // 縦横のセル数を決める（正方形に近いグリッド）
        // モバイル向けは列数を抑えて見やすくする
        let cols, rows;
        if (forMobile) {
            cols = Math.min(3, Math.max(2, Math.floor(window.innerWidth / 140)));
            rows = Math.ceil(count / cols);
        } else {
            cols = Math.ceil(Math.sqrt(count));
            rows = Math.ceil(count / cols);
        }

        // マージンを少し確保してセル幅高さを計算
        const margin = 12;
        const usableW = Math.max(100, stageW - margin * 2);
        const usableH = Math.max(100, stageH - margin * 2);
        const cellW = Math.floor(usableW / cols);
        const cellH = Math.floor(usableH / rows);

        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if (idx >= count) break;
                const left = margin + c * cellW + Math.floor((cellW - Math.min(cellW, forMobile ? 160 : 220)) / 2);
                const top = margin + r * cellH + Math.floor((cellH - Math.min(cellH, forMobile ? 140 : 180)) / 2);
                // width/height はベース想定値（配置のための目安）。モバイルはやや小さめを目安に
                const width = Math.min(cellW - 12, forMobile ? 160 : 220);
                const height = Math.min(cellH - 12, Math.round(width * 0.75));
                positions.push({ left, top, width, height });
                idx++;
            }
        }
        return positions;
    }

    if (!window.PRESET_POSITIONS || !Array.isArray(window.PRESET_POSITIONS) || window.PRESET_POSITIONS.length === 0) {
        // ユーザー指定の固定プレセット座標（永続化）
        // 右側優先で並べ替え：右側の枠を先に多めに配置して、落ちてくる投稿の密度を右寄せにする
            try {
                const isMobileScreen = window.innerWidth <= 480;
                // モバイルでは少し表示数を抑えて、配置を見やすくする
                window.PRESET_POSITIONS = isMobileScreen ? generatePresetPositions(12, true) : generatePresetPositions(20, false);
            } catch (e) {
                // フォールバック: もし generatePresetPositions が使えなければ既存の静的配列を使う
                window.PRESET_POSITIONS = [
                    {left:20, top:420, width:360, height:270},
                    {left:400, top:620, width:200, height:200},
                    {left:350, top:20, width:120, height:90},
                    {left:520, top:140, width:120, height:90},
                    {left:160, top:340, width:120, height:90},
                    {left:300, top:140, width:120, height:90},
                    {left:120, top:260, width:120, height:90},
                    {left:160, top:260, width:120, height:90},
                    {left:300, top:260, width:120, height:90},
                    {left:950, top:800, width:480, height:360},
                    {left:700, top:680, width:140, height:105},
                    {left:820, top:180, width:160, height:120},
                    {left:920, top:40, width:120, height:90},
                    {left:1100, top:220, width:180, height:135},
                    {left:600, top:120, width:120, height:90}
                ];
            }
        // 配列を破壊的に消費しないように読み取り用の index を用意
        window.PRESET_INDEX = 0;
    }

    function applyRandomPosition(wrapper, img) {
        function place() {
            // プレセット座標のみを使用して配置し、上から落ちてくるアニメーションを付与する
            if (!posts) return;
            const stageW = posts.clientWidth;
            const stageH = posts.clientHeight;

            // 元画像幅のベース
            const baseImgW = (img.naturalWidth && img.naturalWidth > 0) ? img.naturalWidth : (img.offsetWidth || 240);

            // PRESET から最終位置を取得
            let presetLeft = 0, presetTop = 0, presetWidth = 120;
            if (window.PRESET_POSITIONS && window.PRESET_POSITIONS.length > 0) {
                const idx = (window.PRESET_INDEX || 0) % window.PRESET_POSITIONS.length;
                const p = window.PRESET_POSITIONS[idx];
                window.PRESET_INDEX = (idx + 1) % window.PRESET_POSITIONS.length;
                if (p) {
                    presetLeft = Number(p.left) || 0;
                    presetTop = Number(p.top) || 0;
                    presetWidth = Number(p.width) || presetWidth;
                }
            }

            // デバイス幅に応じたサイズ/速度調整
            const isMobileScreen = window.innerWidth <= 480;
            const baseVariants = [1.7, 1.15, 1.8];
            const mobileMultiplier = isMobileScreen ? 1.15 : 1.0; // モバイルではやや大きめに
            const SIZE_VARIANTS = baseVariants.map(v => Number((v * mobileMultiplier).toFixed(2)));
            const variantIndex = Math.floor(Math.random() * SIZE_VARIANTS.length);
            const sizeScale = SIZE_VARIANTS[variantIndex];
            const effectiveMaxImgWidth = isMobileScreen ? Math.min(MAX_IMG_WIDTH, 360) : MAX_IMG_WIDTH;
            let targetW = Math.min(Math.round(presetWidth * sizeScale), effectiveMaxImgWidth);

            // 画像幅を適用
            try { img.style.width = targetW + 'px'; } catch (e) {}
            img.dataset.sizeVariant = ['small','medium','large'][variantIndex];

            const imgW = img.offsetWidth || targetW;
            const imgH = img.offsetHeight || Math.round(imgW * 0.75);

            // final はプレセット top/left を尊重。ただしステージ内に収める
            const maxLeft = Math.max(0, stageW - imgW);
            const maxTop = Math.max(0, stageH - imgH);
            const finalLeft = Math.min(Math.max(0, presetLeft), maxLeft);
            const finalTop = Math.min(Math.max(0, presetTop), maxTop);

            // 初期位置は画面上方のランダムなオフセット（上から落ちてくるように）
            // ユーザー要望により、開始位置をさらに約300px上に上げる
            const startTop = -Math.round(350 + Math.random() * 300);

            // まず初期位置にセット
            wrapper.style.left = finalLeft + 'px';
            wrapper.style.top = startTop + 'px';

            // 落下アニメーション（Web Animations API を利用）
            // モバイルではよりゆっくりさせる（例: 5s〜9s）、デスクトップは 4s〜8s
            const duration = (isMobileScreen ? 5000 : 4000) + Math.floor(Math.random() * 4000);
            const easing = 'linear';
            // 無限ループで上から下へ落ちるアニメーション（到達後は再び上から降ってくる）
            const delay = Math.floor(Math.random() * 1200); // バラけさせるための遅延
            const endTop = stageH + imgH + 60; // ステージ下まで落とす
            const rotateStart = -8 + Math.random() * 16;
            const rotateEnd = -6 + Math.random() * 12;

            wrapper.animate([
                { top: startTop + 'px', transform: 'rotate(' + rotateStart + 'deg)' },
                { top: endTop + 'px', transform: 'rotate(' + rotateEnd + 'deg)' }
            ], {
                duration,
                easing,
                iterations: Infinity,
                delay,
                fill: 'none'
            });
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

        // キャプション要素は表示させないため、DOM には追加しない（モーダルで表示する）
        wrapper.appendChild(img);
        posts.appendChild(wrapper);

        // 追加した要素に対して座標を適用する
        try {
            applyRandomPosition(wrapper, img);
        } catch (e) {
            console.error('配置エラー:', e);
        }
        }

        // --- モーダル操作 ---
        function openModal() {
            console.log('openModal called');
            if (!overlay) return;
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
        form.reset();
        postButton.focus();
    }

    if (postButton) {
        console.log('[script] attaching click listener to postButton');
        postButton.addEventListener('click', openModal);
    } else {
        console.warn('[script] postButton not found');
    }
    if (cancelBtn) {
        cancelBtn.addEventListener('click', closeModal);
    }
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
                if (!response.ok) {
                    // サーバーのエラーメッセージを可能な限り取得して表示する
                    let msg = '投稿に失敗しました。';
                    try {
                        const text = await response.text();
                        if (text) msg = text;
                    } catch (e) {}
                    throw new Error(msg);
                }

                const newPost = await response.json();
                addPostToDOM(newPost);
                closeModal();

            } catch (error) {
                console.error('投稿エラー:', error);
                alert(error.message);
            }
        });
    }

    // NOTE: デバッグ用ログ/スタイルは開発時に一時追加しました。
    // 実運用では不要なためここでは削除しています。

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
            // 最大 10 件をランダムに選んで表示する
            posts.innerHTML = '';
            function shuffleArray(arr) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [arr[i], arr[j]] = [arr[j], arr[i]];
                }
            }
            const pool = Array.isArray(existingPosts) ? existingPosts.slice() : [];
            shuffleArray(pool);
            const MAX_SHOW = 20; // 最大表示数を 20 に変更 (ユーザーリクエスト)
            const toShow = pool.slice(0, Math.min(MAX_SHOW, pool.length));
            toShow.forEach(post => addPostToDOM(post));
        } catch (error) {
            console.error('初期化エラー:', error);
            posts.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    initializeApp();
});
