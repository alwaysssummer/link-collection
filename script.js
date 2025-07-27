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
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase();
            this.renderLinks();
        });

        // 카테고리 드롭다운 기능
        document.getElementById('categoryDropdownBtn').addEventListener('click', (e) => {
            e.stopPropagation();
            const menu = document.getElementById('categoryDropdownMenu');
            const btn = document.getElementById('categoryDropdownBtn');
            menu.classList.toggle('show');
            btn.classList.toggle('open');
        });

        // 드롭다운 아이템 클릭
        document.getElementById('categoryDropdownMenu').addEventListener('click', (e) => {
            if (e.target.classList.contains('dropdown-item')) {
                // 활성 상태 업데이트
                document.querySelectorAll('.dropdown-item').forEach(item => item.classList.remove('active'));
                e.target.classList.add('active');
                
                // 현재 카테고리 업데이트
                this.currentCategory = e.target.dataset.category;
                document.getElementById('currentCategoryText').textContent = e.target.textContent;
                
                // 메뉴 닫기
                document.getElementById('categoryDropdownMenu').classList.remove('show');
                document.getElementById('categoryDropdownBtn').classList.remove('open');
                
                // 링크 렌더링
                this.renderLinks();
            }
        });

        // 외부 클릭 시 드롭다운 닫기
        document.addEventListener('click', () => {
            document.getElementById('categoryDropdownMenu').classList.remove('show');
            document.getElementById('categoryDropdownBtn').classList.remove('open');
        });

        // 카테고리 관리 모달 열기
        document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });
        document.getElementById('closeManageCategories').addEventListener('click', () => {
            this.closeCategoryModal();
        });
        window.addEventListener('click', (e) => {
            if (e.target === document.getElementById('manageCategoriesModal')) {
                this.closeCategoryModal();
            }
        });
        // 카테고리 추가
        document.getElementById('addCategoryForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addCategory();
        });

        // 링크 추가/수정 모달 관련
        document.getElementById('addLinkBtn').addEventListener('click', () => {
            this.openModal();
        });
        document.querySelector('.close').addEventListener('click', () => {
            this.closeModal();
        });
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.closeModal();
        });
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') && e.target.id !== 'manageCategoriesModal') {
                this.closeModal();
            }
        });
        document.getElementById('addLinkForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFormSubmit();
        });
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'n') {
                e.preventDefault();
                this.openModal();
            }
        });

        // 테마 토글 버튼
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
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
        if (!name) return;
        // id는 영문+숫자 랜덤
        const id = 'cat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
        this.categories.push({ id, name });
        await this.saveCategories();
        this.renderCategoryButtons();
        this.renderCategoryList();
        this.renderLinks();
        document.getElementById('newCategoryName').value = '';
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
        const columns = document.querySelectorAll('.category-column');
        
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
                const draggingElement = document.querySelector('.link-row.dragging');
                if (draggingElement) {
                    const afterElement = this.getDragAfterElement(list, e.clientY);
                    if (afterElement == null) {
                        list.appendChild(draggingElement);
                    } else {
                        list.insertBefore(draggingElement, afterElement);
                    }
                }
            });

            list.addEventListener('drop', (e) => {
                e.preventDefault();
                const dragData = JSON.parse(e.dataTransfer.getData('application/json'));
                const targetCategory = list.dataset.category;
                
                this.moveLink(dragData.linkId, dragData.sourceCategory, targetCategory, list);
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.link-row:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
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

    async moveLink(linkId, sourceCategory, targetCategory, targetList) {
        const link = this.links.find(l => l.id === linkId);
        if (!link) return;

        // 카테고리 변경
        if (sourceCategory !== targetCategory) {
            link.category = targetCategory;
        }

        // 순서 변경
        const targetLinks = targetList.querySelectorAll('.link-row');
        const newOrder = Array.from(targetLinks).map(row => row.dataset.id);
        
        // 해당 카테고리의 링크들을 새로운 순서로 정렬
        const categoryLinks = this.links.filter(l => l.category === targetCategory);
        const otherLinks = this.links.filter(l => l.category !== targetCategory);
        
        const reorderedCategoryLinks = newOrder.map(id => 
            categoryLinks.find(l => l.id === id) || this.links.find(l => l.id === id)
        ).filter(Boolean);

        this.links = [...otherLinks, ...reorderedCategoryLinks];
        
        await this.saveLinks();
        this.renderLinks();
    }

    // --- 카테고리 드롭다운 동적 렌더링 ---
    renderCategoryButtons() {
        const container = document.getElementById('dropdownCategoryButtons');
        container.innerHTML = this.categories.map(cat =>
            `<div class="dropdown-item" data-category="${cat.id}">${this.escapeHtml(cat.name)}</div>`
        ).join('');
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

    closeModal() {
        document.getElementById('addLinkModal').style.display = 'none';
        this.editingLinkId = null;
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

        // 카테고리별 컬럼으로 렌더링
        if (this.currentCategory === 'all') {
            // 전체 보기: 카테고리별로 그룹화
            const groupedLinks = this.groupLinksByCategory(filteredLinks);
            let html = `<div class="category-columns" id="categoryColumns">`;
            
            let columnIndex = 0;
            for (const [categoryId, links] of Object.entries(groupedLinks)) {
                const categoryName = this.getCategoryName(categoryId);
                html += `
                    <div class="category-column" draggable="true" data-category-id="${categoryId}" data-column-index="${columnIndex}">
                        <h3 class="category-header">
                            <span class="drag-handle">⋮⋮</span>
                            ${categoryName} (${links.length})
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
        } else {
            // 특정 카테고리 보기: 한 컬럼으로 표시
            let html = `
                <div class="single-category">
                    <h3 class="category-header">${this.getCategoryName(this.currentCategory)} (${filteredLinks.length})</h3>
                    <div class="links-list" data-category="${this.currentCategory}">
                        ${filteredLinks.map((link, index) => this.renderLinkRow(link, index)).join('')}
                    </div>
                </div>
            `;
            container.innerHTML = html;
            this.initDragAndDrop();
        }
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
        return `
            <div class="link-row" draggable="true" data-id="${link.id}" data-link-index="${index}">
                <div class="link-title-col">
                    <span class="link-drag-handle">⋮</span>
                    <a href="${link.url}" target="_blank" rel="noopener noreferrer" title="${this.escapeHtml(link.title)}">${this.escapeHtml(link.title)}</a>
                </div>
                <div class="link-description-col">
                    ${link.description ? this.escapeHtml(link.description) : ''}
                </div>
                <div class="link-actions-col">
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