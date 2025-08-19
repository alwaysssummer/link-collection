class LinkCollection {
    constructor() {
        this.links = [];
        this.categories = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.editingLinkId = null;
        this.editingCategoryId = null;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.isFirebaseConnected = typeof firebase !== 'undefined';
        this.favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
        this.init();
    }

    async init() {
        this.applyTheme();
        this.bindEvents();
        
        if (this.isFirebaseConnected) {
            await this.loadFromFirebase();
        } else {
            // Firebase가 없으면 LocalStorage 사용
            this.loadFromLocalStorage();
        }
        
        this.renderCategoryButtons();
        this.renderLinks();
        
        if (this.links.length === 0) {
        this.loadSampleData();
        }
    }

    bindEvents() {
        // 검색 이벤트
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderLinks();
            });
        }

        // 카테고리 드롭다운 이벤트
        const categoryDropdownBtn = document.getElementById('categoryDropdownBtn');
        if (categoryDropdownBtn) {
            categoryDropdownBtn.addEventListener('click', () => {
                const menu = document.getElementById('categoryDropdownMenu');
                if (menu) {
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                }
            });
        }

        const categoryDropdownMenu = document.getElementById('categoryDropdownMenu');
        if (categoryDropdownMenu) {
            categoryDropdownMenu.addEventListener('click', (e) => {
                if (e.target.classList.contains('dropdown-item')) {
                    const category = e.target.dataset.category;
                    this.currentCategory = category;
                    const currentCategoryText = document.getElementById('currentCategoryText');
                    if (currentCategoryText) {
                        currentCategoryText.textContent = e.target.textContent;
                    }
                    if (categoryDropdownMenu) {
                        categoryDropdownMenu.style.display = 'none';
                    }
                    this.renderLinks();
                }
            });
        }

        // 테마 토글 이벤트
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.toggleTheme();
            });
        }

        // 카테고리 추가 폼 이벤트
        const addCategoryForm = document.getElementById('addCategoryForm');
        if (addCategoryForm) {
            addCategoryForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCategory();
        });
        }

        // 카테고리 관리 모달 닫기 버튼
        const closeCategoryModal = document.getElementById('closeCategoryModal');
        if (closeCategoryModal) {
            closeCategoryModal.addEventListener('click', () => {
            this.closeModal();
        });
        }

        // 링크 추가 모달 닫기 버튼 (X)
        const closeLinkModal = document.querySelector('#addLinkModal .close');
        if (closeLinkModal) {
            closeLinkModal.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // 링크 추가 모달 취소 버튼
        const cancelLinkBtn = document.getElementById('cancelBtn');
        if (cancelLinkBtn) {
            cancelLinkBtn.addEventListener('click', () => {
                this.closeModal();
            });
        }

        // 링크 추가 폼 이벤트
        const addLinkForm = document.getElementById('addLinkForm');
        if (addLinkForm) {
            addLinkForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }

        // 모달 외부 클릭 시 닫기
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // ESC 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    }

    // --- 카테고리 관리 모달 ---
    openCategoryModal() {
        this.renderCategoryList();
        document.getElementById('manageCategoriesModal').style.display = 'block';
        document.getElementById('newCategoryName').value = '';
    }
    closeCategoryModal() {
        document.getElementById('manageCategoriesModal').style.display = 'none';
        this.editingCategoryId = null;
    }
    async addCategory() {
        const name = document.getElementById('newCategoryName').value.trim();
        if (!name) {
            alert('카테고리 이름을 입력해주세요.');
            return;
        }

        // 중복 확인
        if (this.categories.some(cat => cat.name === name)) {
            alert('이미 존재하는 카테고리 이름입니다.');
            return;
        }

        const newCategory = {
            id: this.generateId(),
            name,
            order: this.categories.length,
            createdAt: this.isFirebaseConnected ? new Date() : new Date().toISOString(),
            updatedAt: this.isFirebaseConnected ? new Date() : new Date().toISOString()
        };

        this.categories.push(newCategory);
        await this.saveCategories();
        this.renderCategoryButtons();
        this.renderLinks();
        
        // 모달 닫기
        this.closeModal();
        this.showNotification('새 카테고리가 추가되었습니다.');
    }

    // 빠른 카테고리 추가 (모달 없이)
    async quickAddCategory() {
        const name = prompt('새 카테고리 이름을 입력하세요:');
        if (!name || !name.trim()) {
            return;
        }

        const trimmedName = name.trim();
        
        // 중복 확인
        if (this.categories.some(cat => cat.name === trimmedName)) {
            alert('이미 존재하는 카테고리 이름입니다.');
            return;
        }

        const newCategory = {
            id: this.generateId(),
            name: trimmedName,
            order: this.categories.length,
            createdAt: this.isFirebaseConnected ? new Date() : new Date().toISOString(),
            updatedAt: this.isFirebaseConnected ? new Date() : new Date().toISOString()
        };

        this.categories.push(newCategory);
        await this.saveCategories();
        this.renderCategoryButtons();
        this.renderLinks();
        
        this.showNotification(`새 카테고리 "${trimmedName}"가 추가되었습니다.`);
    }

    editCategory(id) {
        this.editingCategoryId = id;
        this.renderCategoryList();
    }
    async saveEditCategory(id) {
        const input = document.getElementById('editCategoryInput_' + id);
        const name = input.value.trim();
        if (!name) return;
        const cat = this.categories.find(c => c.id === id);
        if (cat) cat.name = name;
        await this.saveCategories();
        this.editingCategoryId = null;
        this.renderCategoryButtons();
        this.renderCategoryList();
        this.renderLinks();
    }
    async deleteCategory(id) {
        if (!confirm('이 카테고리를 삭제하시겠습니까? 해당 카테고리의 링크는 "미분류"로 이동합니다.')) return;
        this.categories = this.categories.filter(c => c.id !== id);
        // 해당 카테고리의 링크는 "uncategorized"로 이동
        this.links = this.links.map(link => link.category === id ? {...link, category: 'uncategorized'} : link);
        await this.saveCategories();
        await this.saveLinks();
        this.renderCategoryButtons();
        this.renderCategoryList();
        this.renderLinks();
    }
    renderCategoryList() {
        const ul = document.getElementById('categoryList');
        ul.innerHTML = this.categories.map(cat => {
            if (this.editingCategoryId === cat.id) {
                return `<li><input type="text" id="editCategoryInput_${cat.id}" value="${this.escapeHtml(cat.name)}" />
                    <button class="edit-btn" onclick="linkCollection.saveEditCategory('${cat.id}')">저장</button>
                    <button class="delete-btn" onclick="linkCollection.deleteCategory('${cat.id}')">삭제</button></li>`;
            } else {
                return `<li><span>${this.escapeHtml(cat.name)}</span>
                    <button class="edit-btn" onclick="linkCollection.editCategory('${cat.id}')">이름변경</button>
                    <button class="delete-btn" onclick="linkCollection.deleteCategory('${cat.id}')">삭제</button></li>`;
            }
        }).join('');
    }
    async saveCategories() {
        if (this.isFirebaseConnected) {
            try {
                // Firebase에서 모든 카테고리 문서 삭제 후 재생성
                const batch = db.batch();
                
                // 기존 카테고리 삭제
                const existingCategories = await db.collection('categories').get();
                existingCategories.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // 새 카테고리 추가
                this.categories.forEach((category, index) => {
                    const categoryRef = db.collection('categories').doc(category.id);
                    batch.set(categoryRef, {
                        ...category,
                        order: index,
                        updatedAt: new Date()
                    });
                });

                await batch.commit();
                console.log('Firebase에 카테고리 저장 완료');
            } catch (error) {
                console.error('Firebase 카테고리 저장 실패:', error);
                // 실패 시 LocalStorage로 대체
                localStorage.setItem('categories', JSON.stringify(this.categories));
            }
        } else {
        localStorage.setItem('categories', JSON.stringify(this.categories));
        }
    }

    // --- 즐겨찾기 관리 ---
    toggleFavorite(linkId) {
        const index = this.favorites.indexOf(linkId);
        if (index > -1) {
            this.favorites.splice(index, 1);
        } else {
            this.favorites.push(linkId);
        }
        localStorage.setItem('favorites', JSON.stringify(this.favorites));
        this.renderLinks();
    }

    isFavorite(linkId) {
        return this.favorites.includes(linkId);
    }

    getFavoriteLinks() {
        return this.links.filter(link => this.favorites.includes(link.id));
    }

    // --- 테마 관리 ---
    applyTheme() {
        document.documentElement.setAttribute('data-theme', this.currentTheme);
        this.updateThemeIcon();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.applyTheme();
    }

    updateThemeIcon() {
        const icon = document.querySelector('#themeToggle i');
        if (this.currentTheme === 'dark') {
            icon.className = 'fas fa-sun';
        } else {
            icon.className = 'fas fa-moon';
        }
    }

    // --- Firebase 데이터 관리 ---
    async loadFromFirebase() {
        try {
            // 카테고리 로드
            const categoriesSnapshot = await db.collection('categories').orderBy('order', 'asc').get();
            this.categories = categoriesSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // 기본 카테고리가 없으면 생성
            if (this.categories.length === 0) {
                await this.createDefaultCategories();
            }

            // 링크 로드
            const linksSnapshot = await db.collection('links').orderBy('createdAt', 'desc').get();
            this.links = linksSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            console.log('Firebase에서 데이터 로드 완료');
        } catch (error) {
            console.error('Firebase 데이터 로드 실패:', error);
            // Firebase 실패 시 LocalStorage로 대체
            this.loadFromLocalStorage();
        }
    }

    loadFromLocalStorage() {
        this.links = JSON.parse(localStorage.getItem('links')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || [
            { id: 'work', name: '업무', order: 0 },
            { id: 'study', name: '학습', order: 1 },
            { id: 'entertainment', name: '엔터테인먼트', order: 2 },
            { id: 'tools', name: '도구', order: 3 },
            { id: 'social', name: '소셜', order: 4 }
        ];
    }

    async createDefaultCategories() {
        const defaultCategories = [
            { id: 'work', name: '업무', order: 0 },
            { id: 'study', name: '학습', order: 1 },
            { id: 'entertainment', name: '엔터테인먼트', order: 2 },
            { id: 'tools', name: '도구', order: 3 },
            { id: 'social', name: '소셜', order: 4 }
        ];

        for (const category of defaultCategories) {
            await db.collection('categories').doc(category.id).set(category);
        }
        
        this.categories = defaultCategories;
    }

    // --- 드래그 앤 드롭 기능 ---
    initDragAndDrop() {
        this.initCategoryDragAndDrop();
        this.initLinkDragAndDrop();
    }

    initCategoryDragAndDrop() {
        const columns = document.querySelectorAll('.category-column:not(.favorites-column)');
        
        columns.forEach(column => {
            column.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', column.dataset.categoryId);
                e.dataTransfer.effectAllowed = 'move';
                column.classList.add('dragging');
            });

            column.addEventListener('dragend', (e) => {
                column.classList.remove('dragging');
            });

            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                const draggedCategoryId = e.dataTransfer.getData('text/plain');
                const targetCategoryId = column.dataset.categoryId;
                
                if (draggedCategoryId !== targetCategoryId) {
                    this.reorderCategories(draggedCategoryId, targetCategoryId);
                }
            });
        });
    }

    initLinkDragAndDrop() {
        const linkRows = document.querySelectorAll('.link-row');
        const linkLists = document.querySelectorAll('.links-list');
        
        linkRows.forEach(row => {
            row.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    linkId: row.dataset.id,
                    sourceCategory: row.closest('.links-list').dataset.category
                }));
                e.dataTransfer.effectAllowed = 'move';
                row.classList.add('dragging');
            });

            row.addEventListener('dragend', (e) => {
                row.classList.remove('dragging');
            });
        });

        linkLists.forEach(list => {
            list.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
            });

            list.addEventListener('drop', (e) => {
                e.preventDefault();
                const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                const targetCategory = list.dataset.category;
                
                this.moveLink(dragData.linkId, dragData.sourceCategory, targetCategory);
            });
        });
    }



    async reorderCategories(draggedCategoryId, targetCategoryId) {
        const draggedIndex = this.categories.findIndex(cat => cat.id === draggedCategoryId);
        const targetIndex = this.categories.findIndex(cat => cat.id === targetCategoryId);
        
        if (draggedIndex !== -1 && targetIndex !== -1) {
            const [draggedCategory] = this.categories.splice(draggedIndex, 1);
            this.categories.splice(targetIndex, 0, draggedCategory);
            
            await this.saveCategories();
            this.renderCategoryButtons();
            this.renderLinks();
        }
    }

    async moveLink(linkId, sourceCategory, targetCategory) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) return;

        // 카테고리 변경
        if (sourceCategory !== targetCategory) {
            link.category = targetCategory;
            await this.saveLinks();
            this.renderLinks();
        }
    }

    // --- 인라인 편집 기능 ---
    startInlineEdit(linkId, field) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) return;

        const row = document.querySelector(`[data-id="${linkId}"]`);
        const targetElement = row.querySelector(`.link-${field}-text`);
        
        if (!targetElement) return;

        const currentValue = field === 'title' ? link.title : (link.description || '');
        
        // 입력 필드 생성
        const input = document.createElement('input');
        input.type = 'text';
        input.value = currentValue;
        input.className = `inline-edit-input ${field}-input`;
        input.style.cssText = `
            width: 100%;
            padding: 2px 4px;
            border: 1px solid #667eea;
            border-radius: 3px;
            font-size: inherit;
            background: white;
            outline: none;
        `;

        // 저장 버튼
        const saveBtn = document.createElement('button');
        saveBtn.innerHTML = '💾';
        saveBtn.className = 'inline-save-btn';
        saveBtn.style.cssText = `
            margin-left: 4px;
            padding: 2px 6px;
            border: none;
            border-radius: 3px;
            background: #667eea;
            color: white;
            cursor: pointer;
            font-size: 10px;
        `;

        // 취소 버튼
        const cancelBtn = document.createElement('button');
        cancelBtn.innerHTML = '❌';
        cancelBtn.className = 'inline-cancel-btn';
        cancelBtn.style.cssText = `
            margin-left: 2px;
            padding: 2px 6px;
            border: none;
            border-radius: 3px;
            background: #e74c3c;
            color: white;
            cursor: pointer;
            font-size: 10px;
        `;

        // 이벤트 리스너
        const saveEdit = async () => {
            const newValue = input.value.trim();
            if (newValue !== currentValue) {
                if (field === 'title') {
                    link.title = newValue;
                } else {
                    link.description = newValue;
                }
                link.updatedAt = this.isFirebaseConnected ? new Date() : new Date().toISOString();
                await this.saveLinks();
                this.renderLinks();
            } else {
                this.cancelInlineEdit(targetElement, currentValue);
            }
        };

        const cancelEdit = () => {
            this.cancelInlineEdit(targetElement, currentValue);
        };

        // 키보드 이벤트
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                saveEdit();
            } else if (e.key === 'Escape') {
                cancelEdit();
            }
        });

        saveBtn.addEventListener('click', saveEdit);
        cancelBtn.addEventListener('click', cancelEdit);

        // 원본 텍스트를 입력 필드로 교체
        targetElement.innerHTML = '';
        targetElement.appendChild(input);
        targetElement.appendChild(saveBtn);
        targetElement.appendChild(cancelBtn);
        
        // 입력 필드에 포커스
        input.focus();
        input.select();
    }

    cancelInlineEdit(targetElement, originalValue) {
        targetElement.innerHTML = this.escapeHtml(originalValue);
    }

    // --- 카테고리별 빠른 링크 추가 ---
    quickAddToCategory(categoryId) {
        // 해당 카테고리로 설정하고 모달 열기
        this.currentCategory = categoryId;
        
        // 카테고리 드롭다운 텍스트 업데이트
        const categoryName = this.getCategoryName(categoryId);
        document.getElementById('currentCategoryText').textContent = categoryName;
        
        // 모달 열기
        this.openModal();
        
        // 카테고리 자동 선택
        setTimeout(() => {
            const categorySelect = document.getElementById('linkCategory');
            if (categorySelect) {
                categorySelect.value = categoryId;
            }
        }, 100);
    }

    // --- 카테고리 드롭다운 동적 렌더링 ---
    renderCategoryButtons() {
        const container = document.getElementById('categoryDropdownMenu');
        if (container) {
            // 기존 카테고리 아이템들 제거 (전체 옵션 제외)
            const existingCategoryItems = container.querySelectorAll('.dropdown-item:not([data-category="all"])');
            existingCategoryItems.forEach(item => item.remove());
            
            // 새로운 카테고리들 추가
            const categoryItems = this.categories.map(cat =>
                `<div class="dropdown-item" data-category="${cat.id}">${this.escapeHtml(cat.name)}</div>`
        ).join('');
            
            // "전체" 옵션 다음에 카테고리들 추가
            const allOption = container.querySelector('.dropdown-item[data-category="all"]');
            if (allOption) {
                allOption.insertAdjacentHTML('afterend', categoryItems);
            }
        }
    }

    // --- 링크 추가/수정 모달 ---
    openModal(linkData = null) {
        const modal = document.getElementById('addLinkModal');
        const form = document.getElementById('addLinkForm');
        const title = modal.querySelector('h2');
        // 카테고리 select 동적 렌더링
        const select = document.getElementById('linkCategory');
        select.innerHTML = this.categories.map(cat => `<option value="${cat.id}">${this.escapeHtml(cat.name)}</option>`).join('') + '<option value="uncategorized">미분류</option>';
        if (linkData) {
            title.textContent = '링크 수정';
            this.editingLinkId = linkData.id;
            document.getElementById('linkTitle').value = linkData.title;
            document.getElementById('linkUrl').value = linkData.url;
            document.getElementById('linkCategory').value = linkData.category;
            document.getElementById('linkDescription').value = linkData.description || '';
        } else {
            title.textContent = '새 링크 추가';
            this.editingLinkId = null;
            form.reset();
        }
        modal.style.display = 'block';
        document.getElementById('linkTitle').focus();
    }

    // --- 카테고리 추가 모달 ---
    openCategoryModal() {
        this.editingCategoryId = null;
        document.getElementById('newCategoryName').value = '';
        document.getElementById('manageCategoriesModal').style.display = 'block';
        document.getElementById('newCategoryName').focus();
    }

    closeModal() {
        document.getElementById('addLinkModal').style.display = 'none';
        document.getElementById('manageCategoriesModal').style.display = 'none';
        this.editingLinkId = null;
        this.editingCategoryId = null;
    }

    async handleFormSubmit() {
        const title = document.getElementById('linkTitle').value.trim();
        const url = document.getElementById('linkUrl').value.trim();
        const category = document.getElementById('linkCategory').value;
        const description = document.getElementById('linkDescription').value.trim();

        if (!title || !url) {
            alert('제목과 URL은 필수입니다.');
            return;
        }

        if (this.editingLinkId) {
            // 링크 수정
            const index = this.links.findIndex(link => link.id === this.editingLinkId);
            if (index !== -1) {
                this.links[index] = {
                    ...this.links[index],
                    title,
                    url,
                    category,
                    description,
                    updatedAt: this.isFirebaseConnected ? new Date() : new Date().toISOString()
                };
            }
        } else {
            // 새 링크 추가
            const newLink = {
                id: this.generateId(),
                title,
                url,
                category,
                description,
                createdAt: this.isFirebaseConnected ? new Date() : new Date().toISOString(),
                updatedAt: this.isFirebaseConnected ? new Date() : new Date().toISOString()
            };
            this.links.unshift(newLink);
        }

        await this.saveLinks();
        
        // 링크 추가 후 전체 카테고리 보기로 리셋
        this.currentCategory = 'all';
        const currentCategoryText = document.getElementById('currentCategoryText');
        if (currentCategoryText) {
            currentCategoryText.textContent = '전체';
        }
        
        this.renderLinks();
        this.closeModal();
        this.showNotification(this.editingLinkId ? '링크가 수정되었습니다.' : '링크가 추가되었습니다.');
    }

    async deleteLink(id) {
        if (confirm('정말로 이 링크를 삭제하시겠습니까?')) {
            this.links = this.links.filter(link => link.id !== id);
            await this.saveLinks();
            this.renderLinks();
            this.showNotification('링크가 삭제되었습니다.');
        }
    }

    editLink(id) {
        const link = this.links.find(link => link.id === id);
        if (link) {
            this.openModal(link);
        }
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    async saveLinks() {
        if (this.isFirebaseConnected) {
            try {
                const batch = db.batch();
                
                // 기존 링크 삭제
                const existingLinks = await db.collection('links').get();
                existingLinks.docs.forEach(doc => {
                    batch.delete(doc.ref);
                });

                // 새 링크 추가
                this.links.forEach(link => {
                    const linkRef = db.collection('links').doc(link.id);
                    batch.set(linkRef, {
                        ...link,
                        updatedAt: new Date()
                    });
                });

                await batch.commit();
                console.log('Firebase에 링크 저장 완료');
            } catch (error) {
                console.error('Firebase 링크 저장 실패:', error);
                // 실패 시 LocalStorage로 대체
                localStorage.setItem('links', JSON.stringify(this.links));
            }
        } else {
        localStorage.setItem('links', JSON.stringify(this.links));
        }
    }

    getFilteredLinks() {
        let filtered = this.links;

        // 카테고리 필터
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(link => link.category === this.currentCategory);
        }

        // 검색 필터
        if (this.searchTerm) {
            filtered = filtered.filter(link => 
                link.title.toLowerCase().includes(this.searchTerm) ||
                link.description.toLowerCase().includes(this.searchTerm) ||
                link.url.toLowerCase().includes(this.searchTerm)
            );
        }

        return filtered;
    }

    renderLinks() {
        const container = document.getElementById('linksContainer');
        const filteredLinks = this.getFilteredLinks();

        if (filteredLinks.length === 0) {
            if (this.links.length === 0) {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-bookmark"></i>
                        <h3>아직 링크가 없습니다</h3>
                        <p>첫 번째 링크를 추가해보세요!</p>
                    </div>
                `;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-search"></i>
                        <h3>검색 결과가 없습니다</h3>
                        <p>다른 검색어를 시도해보세요.</p>
                    </div>
                `;
            }
            return;
        }

        // 즐겨찾기 카드를 첫 번째에 표시
        const favoriteLinks = this.getFavoriteLinks();
        let html = `<div class="category-columns" id="categoryColumns">`;
        
        // 즐겨찾기 카드 (항상 첫 번째)
        if (favoriteLinks.length > 0) {
            html += `
                <div class="category-column favorites-column" data-category-id="favorites" data-column-index="0">
                    <h3 class="category-header">
                        <i class="fas fa-star" style="color: #34495e; margin-right: 8px;"></i>
                        즐겨찾기 (${favoriteLinks.length})
                    </h3>
                    <div class="links-list" data-category="favorites">
                        ${favoriteLinks.map((link, index) => this.renderLinkRow(link, index)).join('')}
                    </div>
                </div>
            `;
        }
        
        // 기존 카테고리별 컬럼 렌더링
        const groupedLinks = this.groupLinksByCategory(filteredLinks);
        let columnIndex = favoriteLinks.length > 0 ? 1 : 0;
        
        for (const [categoryId, links] of Object.entries(groupedLinks)) {
            const categoryName = this.getCategoryName(categoryId);
            
            html += `
                <div class="category-column" draggable="true" data-category-id="${categoryId}" data-column-index="${columnIndex}">
                    <h3 class="category-header">
                        <span class="drag-handle">⋮⋮</span>
                        ${categoryName} (${links.length})
                        <button class="quick-add-btn" onclick="linkCollection.quickAddToCategory('${categoryId}')" title="${categoryName}에 링크 추가">
                            <i class="fas fa-plus"></i>
                        </button>
                    </h3>
                    <div class="links-list" data-category="${categoryId}">
                        ${links.map((link, index) => this.renderLinkRow(link, index)).join('')}
                    </div>
                </div>
            `;
            columnIndex++;
        }
        html += '</div>';
        container.innerHTML = html;
        this.initDragAndDrop();
    }

    getCategoryName(category) {
        const cat = this.categories.find(c => c.id === category);
        return cat ? cat.name : (category === 'uncategorized' ? '미분류' : category);
    }

    groupLinksByCategory(links) {
        const grouped = {};
        
        // 모든 카테고리를 먼저 초기화
        this.categories.forEach(cat => {
            grouped[cat.id] = [];
        });
        grouped['uncategorized'] = [];
        
        // 링크들을 카테고리별로 분류
        links.forEach(link => {
            const category = link.category || 'uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(link);
        });
        
        // 빈 카테고리 제거
        Object.keys(grouped).forEach(key => {
            if (grouped[key].length === 0) {
                delete grouped[key];
            }
        });
        
        return grouped;
    }

    renderLinkRow(link, index) {
        const isFav = this.isFavorite(link.id);
        const starIcon = isFav ? 'fas fa-star' : 'far fa-star';
        const starColor = isFav ? '#34495e' : '#bdc3c7';
        
        return `
            <div class="link-row" draggable="true" data-id="${link.id}" data-link-index="${index}">
                <div class="link-title-col">
                    <span class="link-drag-handle">⋮</span>
                    <a href="${link.url}" target="_blank" class="link-title-link" title="새 탭에서 링크 열기">${this.escapeHtml(link.title)}</a>
                </div>
                <div class="link-actions-col">
                    <button class="action-btn favorite-btn" onclick="linkCollection.toggleFavorite('${link.id}')" title="${isFav ? '즐겨찾기 해제' : '즐겨찾기 추가'}">
                        <i class="${starIcon}" style="color: ${starColor};"></i>
                    </button>
                    <button class="action-btn edit-btn" onclick="linkCollection.editLink('${link.id}')" title="수정">✏️</button>
                    <button class="action-btn delete-btn" onclick="linkCollection.deleteLink('${link.id}')" title="삭제">🗑️</button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showNotification(message) {
        // 간단한 알림 표시
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 2000);
    }

    loadSampleData() {
        // 샘플 데이터가 없을 때만 로드
        if (this.links.length === 0) {
            const sampleLinks = [
                {
                    id: this.generateId(),
                    title: 'GitHub',
                    url: 'https://github.com',
                    category: 'tools',
                    description: '코드 저장소 및 협업 플랫폼',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    title: 'Stack Overflow',
                    url: 'https://stackoverflow.com',
                    category: 'study',
                    description: '개발자 질문답변 커뮤니티',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                },
                {
                    id: this.generateId(),
                    title: 'YouTube',
                    url: 'https://youtube.com',
                    category: 'entertainment',
                    description: '동영상 공유 플랫폼',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }
            ];
            
            this.links = sampleLinks;
            this.saveLinks();
            this.renderLinks();
        }
    }
}

// CSS 애니메이션 추가
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// 앱 초기화
const linkCollection = new LinkCollection(); 