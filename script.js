document.addEventListener('DOMContentLoaded', () => {
    const imageGrid = document.getElementById('image-grid');
    const previewImage = document.getElementById('preview-image');
    const detailFilename = document.getElementById('detail-filename');
    const detailDate = document.getElementById('detail-date');
    const detailDimensions = document.getElementById('detail-dimensions');
    const detailSize = document.getElementById('detail-size');
    const detailColors = document.getElementById('detail-colors');
    const detailColorsSimple = document.getElementById('detail-colors-simple');
    const contentDescription = document.getElementById('content-description');
    const contentFull = document.getElementById('content-full');

    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContainers = document.querySelectorAll('.tab-container');

    const btnGridCompact = document.getElementById('view-grid-compact');
    const btnGridLarge = document.getElementById('view-grid-large');
    const btnList = document.getElementById('view-list');

    const searchInput = document.getElementById('search-input');
    const albumList = document.getElementById('album-list');
    const categoryList = document.getElementById('category-list');
    const selectAlbum = document.getElementById('new-album');
    const selectCategory = document.getElementById('new-category');
    const inputNewAlbum = document.getElementById('add-new-album');
    const inputNewCategory = document.getElementById('add-new-category');

    const btnAddImage = document.getElementById('btn-add-image');
    const modalAdd = document.getElementById('modal-add');
    const modalClose = document.getElementById('modal-close');
    const modalCancel = document.getElementById('modal-cancel');
    const formAdd = document.getElementById('form-add-image');

    let imagesData = [];
    let currentView = 'grid-compact';
    let selectedImageId = null;
    let searchQuery = '';
    let filterAlbum = null;
    let filterCategory = null;

    async function loadImages() {
        try {
            const response = await fetch('images.json');
            imagesData = await response.json();
            if (imagesData.length > 0) {
                selectedImageId = imagesData[0].id;
                updatePreview(imagesData[0]);
            }
            populateSidebars();
            renderGrid();
        } catch (error) {
            console.error('Error loading images:', error);
        }
    }

    // Modal Logic
    btnAddImage.onclick = () => {
        populateModalSelects();
        modalAdd.classList.remove('hidden');
    };

    function populateModalSelects() {
        const albums = [...new Set(imagesData.map(img => img.album))].sort();
        const categories = [...new Set(imagesData.map(img => img.category))].sort();

        selectAlbum.innerHTML = albums.map(a => `<option value="${a}">${a}</option>`).join('');
        selectCategory.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }
    
    const closeModal = () => {
        modalAdd.classList.add('hidden');
        formAdd.reset();
        selectAlbum.disabled = false;
        selectCategory.disabled = false;
    };

    inputNewAlbum.addEventListener('input', (e) => {
        selectAlbum.disabled = e.target.value.trim() !== "";
    });

    inputNewCategory.addEventListener('input', (e) => {
        selectCategory.disabled = e.target.value.trim() !== "";
    });

    modalClose.onclick = closeModal;
    modalCancel.onclick = closeModal;
    window.onclick = (e) => { if (e.target === modalAdd) closeModal(); };

    formAdd.onsubmit = (e) => {
        e.preventDefault();
        
        const newAlbumInput = document.getElementById('add-new-album').value.trim();
        const newCategoryInput = document.getElementById('add-new-category').value.trim();
        
        const album = newAlbumInput || selectAlbum.value || "Default Album";
        const category = newCategoryInput || selectCategory.value || "Default Category";

        const newImage = {
            id: Date.now(),
            url: document.getElementById('new-url').value,
            fileName: document.getElementById('new-filename').value,
            album: album,
            category: category,
            dateTaken: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            dimensions: "Original",
            size: "Unknown",
            colors: ["#6B7280", "#9CA3AF"],
            colorNames: ["gray", "lightgray"],
            tags: ["new"],
            type: "image/jpeg",
            description: document.getElementById('new-content').value,
            content: document.getElementById('new-content').value,
            alt: document.getElementById('new-filename').value
        };

        imagesData.push(newImage);
        closeModal();
        populateSidebars();
        renderGrid();
        updatePreview(newImage);
        selectedImageId = newImage.id;
        renderGrid(); // Rerender to show selection
    };

    // Tab Switching Logic
    tabButtons.forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.id.replace('tab-', 'container-');
            
            // Update Buttons
            tabButtons.forEach(b => {
                b.classList.remove('text-blue-600', 'border-b-2', 'border-blue-600', 'font-medium');
                b.classList.add('text-gray-500');
            });
            btn.classList.add('text-blue-600', 'border-b-2', 'border-blue-600', 'font-medium');
            btn.classList.remove('text-gray-500');

            // Update Containers
            tabContainers.forEach(c => c.classList.add('hidden'));
            document.getElementById(tabId).classList.remove('hidden');
        };
    });

    function populateSidebars() {
        const albums = [...new Set(imagesData.map(img => img.album))].sort();
        const categories = [...new Set(imagesData.map(img => img.category))].sort();

        renderSidebarList(albumList, albums, 'album');
        renderSidebarList(categoryList, categories, 'category');
    }

    function renderSidebarList(element, items, type) {
        element.innerHTML = '';
        
        // Add "All" option
        const allLi = createSidebarItem('All', null, type);
        element.appendChild(allLi);

        items.forEach(item => {
            const li = createSidebarItem(item, item, type);
            element.appendChild(li);
        });
    }

    function createSidebarItem(label, value, type) {
        const li = document.createElement('li');
        li.className = 'mb-1 relative group';
        const a = document.createElement('a');
        const isActive = (type === 'album' && filterAlbum === value) || (type === 'category' && filterCategory === value);
        
        a.href = '#';
        a.className = `flex items-center py-2 px-3 rounded-lg transition-colors ${isActive ? 'text-blue-600 bg-blue-100 font-medium' : 'text-gray-700 hover:bg-gray-200'}`;
        
        const labelSpan = document.createElement('span');
        labelSpan.textContent = label;
        labelSpan.className = 'truncate';
        a.appendChild(labelSpan);
        
        a.onclick = (e) => {
            e.preventDefault();
            if (type === 'album') {
                filterAlbum = value;
                filterCategory = null;
            } else {
                filterCategory = value;
                filterAlbum = null;
            }
            populateSidebars();
            renderGrid();
        };

        // Actions (Only for specific items, not "All")
        if (value !== null) {
            const actions = document.createElement('div');
            actions.className = 'sidebar-item-actions flex space-x-1 flex-shrink-0';
            
            const editBtn = document.createElement('span');
            editBtn.className = 'material-icons action-icon edit';
            editBtn.textContent = 'edit';
            editBtn.title = 'Edit name';
            editBtn.onclick = (e) => {
                e.stopPropagation();
                handleEditItem(value, type);
            };

            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'material-icons action-icon delete';
            deleteBtn.textContent = 'delete';
            deleteBtn.title = 'Delete items';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                handleDeleteItem(value, type);
            };

            actions.appendChild(editBtn);
            actions.appendChild(deleteBtn);
            a.appendChild(actions);
        }
        
        li.appendChild(a);
        return li;
    }

    function handleEditItem(oldValue, type) {
        const newValue = prompt(`Edit ${type} name:`, oldValue);
        if (newValue && newValue.trim() !== "" && newValue !== oldValue) {
            imagesData.forEach(img => {
                if (type === 'album' && img.album === oldValue) img.album = newValue.trim();
                if (type === 'category' && img.category === oldValue) img.category = newValue.trim();
            });
            if (type === 'album' && filterAlbum === oldValue) filterAlbum = newValue.trim();
            if (type === 'category' && filterCategory === oldValue) filterCategory = newValue.trim();
            populateSidebars();
            renderGrid();
        }
    }

    function handleDeleteItem(value, type) {
        const msg = type === 'album' 
            ? `¿Estás seguro de que deseas eliminar este álbum? Las imágenes se moverán a "Sin clasificar".`
            : `¿Estás seguro de que deseas eliminar esta categoría? Las imágenes se moverán a "Sin clasificar".`;

        if (confirm(msg)) {
            imagesData.forEach(img => {
                if (type === 'album' && img.album === value) {
                    img.album = "Sin clasificar";
                } else if (type === 'category' && img.category === value) {
                    img.category = "Sin clasificar";
                }
            });

            if (type === 'album' && filterAlbum === value) filterAlbum = null;
            if (type === 'category' && filterCategory === value) filterCategory = null;
            
            populateSidebars();
            renderGrid();
        }
    }

    function renderGrid() {
        imageGrid.innerHTML = '';
        imageGrid.className = `view-${currentView}`;
        
        const filteredImages = imagesData.filter(image => {
            const matchesSearch = !searchQuery || [
                image.fileName, image.type, image.album, image.category, image.dateTaken, 
                ...image.tags, ...image.colorNames
            ].some(field => field.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesAlbum = !filterAlbum || image.album === filterAlbum;
            const matchesCategory = !filterCategory || image.category === filterCategory;

            return matchesSearch && matchesAlbum && matchesCategory;
        });

        if (filteredImages.length === 0) {
            imageGrid.innerHTML = '<div class="col-span-full text-center py-10 text-gray-500">No images found</div>';
            return;
        }

        filteredImages.forEach(image => {
            const container = document.createElement('div');
            container.className = `image-item ${selectedImageId === image.id ? 'selected' : ''}`;
            
            const img = document.createElement('img');
            img.src = image.url;
            img.alt = image.alt;
            img.className = (currentView === 'view-list') ? '' : 'rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-all duration-200';
            
            if (selectedImageId === image.id && currentView !== 'view-list') {
                img.classList.add('border-4', 'border-blue-500');
            }

            container.onclick = () => {
                selectedImageId = image.id;
                updatePreview(image);
                renderGrid();
            };

            container.appendChild(img);

            if (currentView === 'list') {
                const info = document.createElement('div');
                info.className = 'image-info';
                info.innerHTML = `
                    <span class="image-name">${image.fileName}</span>
                    <span class="image-meta">${image.dateTaken} • ${image.size}</span>
                `;
                container.appendChild(info);
            }

            imageGrid.appendChild(container);
        });
    }

    function updatePreview(image) {
        previewImage.src = image.url;
        previewImage.alt = image.alt;
        detailFilename.textContent = image.fileName;
        detailDate.textContent = image.dateTaken;
        detailDimensions.textContent = image.dimensions;
        detailSize.textContent = image.size;

        contentDescription.textContent = image.description;
        contentFull.textContent = image.content;

        // Simple preview colors (circles)
        detailColorsSimple.innerHTML = '';
        image.colors.forEach((color, index) => {
            const div = document.createElement('div');
            div.className = 'w-6 h-6 rounded-full shadow-sm cursor-help';
            div.style.backgroundColor = color;
            div.title = `${image.colorNames[index]} (${color})`;
            detailColorsSimple.appendChild(div);
        });

        // Detailed colors (list)
        detailColors.innerHTML = '';
        image.colors.forEach((color, index) => {
            const colorName = image.colorNames[index];
            const div = document.createElement('div');
            div.className = 'flex items-center p-2 rounded-lg bg-gray-50 border border-gray-100';
            div.innerHTML = `
                <div class="w-8 h-8 rounded shadow-sm mr-3" style="background-color: ${color}"></div>
                <div class="flex flex-col">
                    <span class="text-xs font-semibold text-gray-800 uppercase">${colorName}</span>
                    <span class="text-[10px] text-gray-500 font-mono">${color}</span>
                </div>
            `;
            detailColors.appendChild(div);
        });
    }

    function setView(view) {
        currentView = view;
        [btnGridCompact, btnGridLarge, btnList].forEach(btn => {
            btn.classList.remove('text-blue-500');
            btn.classList.add('text-gray-600');
        });
        document.getElementById(`view-${view}`).classList.replace('text-gray-600', 'text-blue-500');
        renderGrid();
    }

    btnGridCompact.onclick = () => setView('grid-compact');
    btnGridLarge.onclick = () => setView('grid-large');
    btnList.onclick = () => setView('list');

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderGrid();
    });

    loadImages();
});
