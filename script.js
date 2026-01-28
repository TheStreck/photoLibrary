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

    formAdd.onsubmit = async (e) => {
        e.preventDefault();
        
        const url = document.getElementById('new-url').value;
        const fileName = document.getElementById('new-filename').value;
        const newAlbumInput = document.getElementById('add-new-album').value.trim();
        const newCategoryInput = document.getElementById('add-new-category').value.trim();
        const contentVal = document.getElementById('new-content').value;

        const album = newAlbumInput || selectAlbum.value || "Sin clasificar";
        const category = newCategoryInput || selectCategory.value || "Sin clasificar";

        // Extract colors automatically
        const extracted = await extractColorsFromImage(url);

        const newImage = {
            id: Date.now(),
            url: url,
            fileName: fileName,
            album: album,
            category: category,
            dateTaken: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
            dimensions: "Procesando...",
            size: "Original",
            colors: extracted.hexCodes,
            colorNames: extracted.names,
            tags: ["new", category.toLowerCase()],
            type: "image/jpeg",
            description: contentVal,
            content: contentVal,
            alt: fileName
        };

        imagesData.push(newImage);
        closeModal();
        populateSidebars();
        renderGrid();
        updatePreview(newImage);
        selectedImageId = newImage.id;
        renderGrid();

        // Optional: Update dimensions once image is loaded in UI
        const tempImg = new Image();
        tempImg.src = url;
        tempImg.onload = () => {
            newImage.dimensions = `${tempImg.width} x ${tempImg.height}`;
            if (selectedImageId === newImage.id) {
                document.getElementById('detail-dimensions').textContent = newImage.dimensions;
            }
        };
    };

    async function extractColorsFromImage(url) {
        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = url;
            
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = 50;
                canvas.height = 50;
                ctx.drawImage(img, 0, 0, 50, 50);
                
                const imageData = ctx.getImageData(0, 0, 50, 50).data;
                const colorMap = {};
                
                for (let i = 0; i < imageData.length; i += 4) {
                    const r = Math.round(imageData[i] / 10) * 10;
                    const g = Math.round(imageData[i+1] / 10) * 10;
                    const b = Math.round(imageData[i+2] / 10) * 10;
                    const rgb = `${r},${g},${b}`;
                    if (imageData[i+3] > 128) {
                        colorMap[rgb] = (colorMap[rgb] || 0) + 1;
                    }
                }
                
                const sortedColors = Object.keys(colorMap).sort((a, b) => colorMap[b] - colorMap[a]);
                const topRgb = sortedColors.slice(0, 5);
                
                const hexCodes = topRgb.map(rgb => {
                    const [r, g, b] = rgb.split(',').map(Number);
                    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase();
                });

                const names = hexCodes.map(hex => getApproxColorName(hex));
                
                resolve({ hexCodes, names });
            };

            img.onerror = () => {
                resolve({ 
                    hexCodes: ["#6B7280", "#9CA3AF", "#D1D5DB", "#E5E7EB", "#F3F4F6"], 
                    names: ["Gray", "Silver", "Light Gray", "Platinum", "White Smoke"] 
                });
            };
        });
    }

    function getApproxColorName(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        
        // Simple heuristic for basic color names
        if (r > 200 && g > 200 && b > 200) return "White";
        if (r < 50 && g < 50 && b < 50) return "Black";
        if (r > g + 40 && r > b + 40) return r > 200 && g > 150 ? "Orange" : "Red";
        if (g > r + 40 && g > b + 40) return "Green";
        if (b > r + 40 && b > g + 40) return "Blue";
        if (r > 150 && g > 150 && b < 100) return "Yellow";
        if (r > 150 && b > 150 && g < 100) return "Purple";
        return "Gray";
    }

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
            div.className = 'w-6 h-6 rounded-full shadow-sm cursor-copy transition-transform hover:scale-110 active:scale-95';
            div.style.backgroundColor = color;
            div.title = `Click to copy: ${image.colorNames[index]} (${color})`;
            
            div.onclick = (e) => {
                e.stopPropagation();
                copyToClipboard(color, div);
            };
            
            detailColorsSimple.appendChild(div);
        });

        // Detailed colors (list)
        detailColors.innerHTML = '';
        image.colors.forEach((color, index) => {
            const colorName = image.colorNames[index];
            const div = document.createElement('div');
            div.className = 'flex items-center p-2 rounded-lg bg-gray-50 border border-gray-100 cursor-copy hover:bg-gray-100 transition-colors active:bg-gray-200';
            div.innerHTML = `
                <div class="w-8 h-8 rounded shadow-sm mr-3" style="background-color: ${color}"></div>
                <div class="flex flex-col">
                    <span class="text-xs font-semibold text-gray-800 uppercase">${colorName}</span>
                    <span class="text-[10px] text-gray-500 font-mono">${color}</span>
                </div>
                <span class="material-icons ml-auto text-gray-300 text-sm copy-confirm hidden">check</span>
            `;
            
            div.onclick = () => copyToClipboard(color, div);
            
            detailColors.appendChild(div);
        });
    }

    function copyToClipboard(text, element) {
        navigator.clipboard.writeText(text).then(() => {
            // Visual feedback
            const originalTitle = element.title;
            const confirmIcon = element.querySelector('.copy-confirm');
            
            if (confirmIcon) {
                confirmIcon.classList.remove('hidden');
                confirmIcon.classList.add('text-green-500');
            } else {
                element.style.ring = "2px solid #10B981";
            }

            const feedback = document.createElement('div');
            feedback.className = 'fixed bottom-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-xl text-sm z-50 animate-bounce';
            feedback.textContent = `Copied: ${text}`;
            document.body.appendChild(feedback);

            setTimeout(() => {
                feedback.remove();
                if (confirmIcon) confirmIcon.classList.add('hidden');
            }, 2000);
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
