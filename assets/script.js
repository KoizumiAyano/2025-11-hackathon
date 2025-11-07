// [script.js] (API連携 + ランダム配置UI 統合版)

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. APIとDOMの基本設定 ---
    const API_URL = 'http://127.0.0.1:8000'; // ⬅️ APIサーバーのURL

    // 投稿モーダル (新規作成)
    const postButton = document.getElementById('postButton');
    const overlay = document.getElementById('modalOverlay');
    const cancelBtn = document.getElementById('cancelPost');
    const form = document.getElementById('postForm');
    const posts = document.getElementById('posts'); // 投稿を配置する「ステージ」

    // 閲覧モーダル (詳細表示)
    const viewOverlay = document.getElementById('viewOverlay');
    const viewClose = document.getElementById('viewClose');
    const viewNick = document.getElementById('viewNick');
    const viewBodyText = document.getElementById('viewBodyText');
    const viewRating = document.getElementById('viewRating');
    const viewLike = document.getElementById('viewLike');
    const viewLikeCount = document.getElementById('viewLikeCount');
    const viewDelete = document.getElementById('viewDelete'); // ⬅️ 追加した削除ボタン
    
    let currentViewedPostId = null; // 閲覧中の投稿のDB-ID

    // --- 2. 投稿の「ランダム配置」ロジック (UI担当のコード) ---
    // (このセクションは元のロジックをほぼそのまま流用・整理)

    function rectsOverlap(a, b) {
        return !(a.left + a.width <= b.left || b.left + b.width <= a.left || a.top + a.height <= b.top || b.top + b.height <= a.top);
    }

    function generatePresetPositions(count = 10) {
        if (!posts) return [];
        const stageW = posts.clientWidth || Math.max(window.innerWidth - 20, 200);
        const stageH = posts.clientHeight || Math.max(window.innerHeight - 20, 200);
        const positions = [];
        const baseline = 120;
        const minW = baseline * 2, maxW = baseline * 5;
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

    // ページ読み込み時に、あらかじめ位置を計算しておく
    if (!window.PRESET_POSITIONS || !Array.isArray(window.PRESET_POSITIONS) || window.PRESET_POSITIONS.length === 0) {
        window.PRESET_POSITIONS = generatePresetPositions(10);
    }

    /**
     * [リファクタリング]
     * 投稿ラッパー要素(div)をステージのランダムな位置に配置する
     * @param {HTMLElement} wrapper - .post ラッパー
     * @param {HTMLElement} img - .post-image 画像
     */
    function applyRandomPosition(wrapper, img) {
        function place() {
            if (!posts) return;
            const stageW = posts.clientWidth;
            const stageH = posts.clientHeight;
            const imgW = img.offsetWidth || 240; // デフォルト幅
            const imgH = img.offsetHeight || 180; // デフォルト高さ

            const maxLeft = Math.max(0, stageW - imgW);
            const maxTop = Math.max(0, stageH - imgH);

            let left = null, top = null;
            
            // PRESET_POSITIONS から位置を取得
            if (window.PRESET_POSITIONS && window.PRESET_POSITIONS.length > 0) {
                const p = window.PRESET_POSITIONS.shift();
                if (p) {
                    left = p.left;
                    top = p.top;
                    try { img.style.width = (Number(p.width) || imgW) + 'px'; } catch (e) {}
                }
            }

            // ランダムフォールバック
            if (left == null) left = Math.floor(Math.random() * (maxLeft + 1));
            if (top == null) top = Math.floor(Math.random() * (maxTop + 1));

            wrapper.style.left = Math.min(Math.max(0, left), maxLeft) + 'px';
            wrapper.style.top = Math.min(Math.max(0, top), maxTop) + 'px';
        }

        if (img.complete && img.naturalWidth) {
            place();
        } else {
            img.addEventListener('load', place);
            setTimeout(place, 300); // フォールバック
        }
    }

    /**
     * [新機能] 
     * APIから取得したpostオブジェクトを元に、DOM(画像)をステージに追加する
     * @param {object} post - APIから返された投稿オブジェクト
     */
    function addPostToDOM(post) {
        // (元の submit ハンドラ内のロジックを、この関数に移動・API対応させた)
        const IMAGES = ['src/image/sunflower.png']; // 画像は仮
        
        const img = document.createElement('img');
        img.className = 'post-image';
        img.src = IMAGES[Math.floor(Math.random() * IMAGES.length)];
        img.alt = `${escapeHtml(post.name)}さんの投稿画像`;

        // -----------------------------------------------------------------
        // [最重要] ローカルID(Date.now)の代わりに、DBのIDとデータを設定
        img.dataset.postId = post.post_id;
        img.dataset.likes = post.like_count;
        img.dataset.nick = post.name;
        img.dataset.content = post.content;
        img.dataset.rating = post.parm_unluckey;
        // -----------------------------------------------------------------

        const wrapper = document.createElement('div');
        wrapper.className = 'post';
        wrapper.style.position = 'absolute';
        
        wrapper.appendChild(img);
        if (posts) posts.appendChild(wrapper);

        // 位置を決定して配置
        applyRandomPosition(wrapper, img);
    }

    // --- 3. 投稿モーダル (新規作成) の制御 ---
    
    if (postButton) postButton.addEventListener('click', openModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

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

    /**
     * [API連携] フォーム送信 (POST /posts/)
     */
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

            // (元のJS: ここでローカルにDOMを作っていた)
            // [新] APIに送信するためのデータを作成
            const postData = {
                name: nick,
                content: content,
                parm_unluckey: parseInt(rating, 10)
            };

            try {
                // APIにPOSTリクエスト
                const response = await fetch(`${API_URL}/posts/`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(postData),
                });

                if (!response.ok) {
                    throw new Error('投稿に失敗しました。');
                }

                // APIがDBに保存した結果 (post_idを含む) を返す
                const newPost = await response.json();
                
                // DBから返ってきたデータを使って、画面に配置
                addPostToDOM(newPost);
                closeModal();

            } catch (error) {
                console.error('投稿エラー:', error);
                alert(error.message);
            }
        });
    }

    // --- 4. 閲覧モーダル (詳細表示) の制御 ---

    if (viewClose) viewClose.addEventListener('click', closeView);
    if (viewOverlay) {
        viewOverlay.addEventListener('click', (e) => {
            if (e.target === viewOverlay) closeView();
        });
    }

    /**
     * [API連携] 画像クリックで閲覧モーダルを開く
     */
    if (posts) {
        posts.addEventListener('click', (e) => {
            const img = e.target.closest && e.target.closest('img.post-image');
            if (img) {
                // (元のJS: 個別に引数を渡していた)
                // [新] img要素の data属性 から情報を読み込む
                openView(img.dataset);
            }
        });
    }
    
    function openView(dataset) {
        if (!viewOverlay) return;
        
        // data属性から読み込んだ値をモーダルにセット
        viewNick.textContent = dataset.nick || '';
        viewBodyText.textContent = dataset.content || '';
        viewRating.textContent = dataset.rating || '';
        viewLikeCount.textContent = dataset.likes || '0';
        
        // [重要] 現在閲覧中の「DBのID」を保持する
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
        currentViewedPostId = null; // IDをクリア
    }

    // ESCキーでのクローズ (両モーダル対応)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (overlay && !overlay.classList.contains('hidden')) closeModal();
            if (viewOverlay && !viewOverlay.classList.contains('hidden')) closeView();
        }
    });

    /**
     * [API連携] いいねボタン (PUT /posts/{id}/like)
     */
    if (viewLike) {
        viewLike.addEventListener('click', async () => {
            if (!currentViewedPostId) return;

            // (元のJS: ローカルの data-likes を+1していた)
            // [新] APIにPUTリクエスト
            try {
                const response = await fetch(`${API_URL}/posts/${currentViewedPostId}/like`, {
                    method: 'PUT'
                });
                if (!response.ok) throw new Error('いいねに失敗');
                
                const updatedPost = await response.json(); // APIから最新のいいね数を取得

                // 画面(モーダル)に反映
                viewLikeCount.textContent = updatedPost.like_count;
                
                // ステージ上の元画像の data 属性も更新 (画面の整合性を保つため)
                const imgEl = document.querySelector(`img.post-image[data-post-id="${currentViewedPostId}"]`);
                if (imgEl) imgEl.dataset.likes = updatedPost.like_count;

                viewLike.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 220 });

            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }

    /**
     * [API連携] 削除ボタン (DELETE /posts/{id})
     */
    if (viewDelete) {
        viewDelete.addEventListener('click', async () => {
            if (!currentViewedPostId) return;
            if (!confirm('この投稿を削除しますか？（蜜の味）')) return;

            try {
                const response = await fetch(`${API_URL}/posts/${currentViewedPostId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) throw new Error('削除に失敗');

                // 画面(ステージ)から画像を削除
                const imgEl = document.querySelector(`img.post-image[data-post-id="${currentViewedPostId}"]`);
                if (imgEl) {
                    imgEl.closest('.post').remove(); // ラッパーごと削除
                }
                
                closeView(); // モーダルを閉じる

            } catch (error) {
                console.error(error);
                alert(error.message);
            }
        });
    }


    // --- 5. ユーティリティと初期化 ---
    
    function escapeHtml(str) {
        if (typeof str !== 'string') return '';
        return str.replace(/[&<>"']/g, (s) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
    }

    /**
     * [API連携] ページ読み込み (GET /posts/)
     */
    async function initializeApp() {
        try {
            const response = await fetch(`${API_URL}/posts/`);
            if (!response.ok) throw new Error('サーバーから投稿を取得できませんでした。');
            
            const existingPosts = await response.json();
            
            posts.innerHTML = ''; // ステージをクリア
            
            // DBから取得したすべての投稿を、画面に配置する
            existingPosts.forEach(post => {
                addPostToDOM(post);
            });

        } catch (error) {
            console.error('初期化エラー:', error);
            posts.innerHTML = `<p class="error">${error.message}</p>`;
        }
    }

    // アプリケーションの初期化（DBから投稿を読み込む）
    initializeApp();
});