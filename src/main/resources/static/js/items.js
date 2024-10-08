document.addEventListener('DOMContentLoaded', function() {
    const itemsPerPage = 10; // Number of items to display per page
    let currentPage = 1;
    let allItems = [];

    loadItems();

    function loadItems() {
        const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
        console.log("Loaded receiptHistory from localStorage:", receiptHistory);
        
        allItems = [];
        receiptHistory.forEach(receipt => {
            if (receipt.purchases && Array.isArray(receipt.purchases)) {
                receipt.purchases.forEach(purchase => {
                    allItems.push({
                        ...purchase,
                        store: receipt.store,
                        date: receipt.date
                    });
                });
            }
        });

        displayItems();
        setupPagination();
    }

    function displayItems() {
        const itemsList = document.getElementById('itemsList');
        itemsList.innerHTML = '';

        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const itemsToDisplay = allItems.slice(startIndex, endIndex);

        if (itemsToDisplay.length === 0) {
            itemsList.innerHTML = '<li class="item-entry">No items available</li>';
        } else {
            itemsToDisplay.forEach((item, index) => {
                const listItem = document.createElement('li');
                listItem.classList.add('item-entry');
                listItem.innerHTML = `
                    <div>
                        <span class="product-name">${item.product_name || 'Unknown Product'}</span>
                        <span class="amount">${item.price} RON</span>
                        <span class="store">${item.store || 'Unknown Store'}</span>
                        <span class="date">${item.date || 'Unknown Date'}</span>
                    </div>
                    <div class="button-container">
                        <button class="button edit-button" onclick="editItem(${startIndex + index})">Edit</button>
                        <button class="button delete-button" onclick="deleteItem(${startIndex + index})">Delete</button>
                    </div>
                `;
                itemsList.appendChild(listItem);
            });
        }
    }

    function setupPagination() {
        const totalPages = Math.ceil(allItems.length / itemsPerPage);
        const paginationContainer = document.getElementById('pagination');
        paginationContainer.innerHTML = '';

        for (let i = 1; i <= totalPages; i++) {
            const pageButton = document.createElement('button');
            pageButton.innerText = i;
            pageButton.classList.add('pagination-button');
            if (i === currentPage) {
                pageButton.classList.add('active');
            }
            pageButton.addEventListener('click', () => {
                currentPage = i;
                displayItems();
                setupPagination();
            });
            paginationContainer.appendChild(pageButton);
        }
    }

    window.editItem = function(index) {
        const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
        let allItems = [];
        let itemFound = false;

        for (let i = 0; i < receiptHistory.length; i++) {
            const receipt = receiptHistory[i];
            if (receipt.purchases && Array.isArray(receipt.purchases)) {
                for (let j = 0; j < receipt.purchases.length; j++) {
                    if (allItems.length === index) {
                        itemFound = true;
                        const item = receipt.purchases[j];
                        Swal.fire({
                            title: 'Edit Item',
                            html: `
                                <input id="editProductName" class="swal2-input" placeholder="Product Name" value="${item.product_name || ''}">
                                <input id="editPrice" class="swal2-input" placeholder="Price" value="${item.price || ''}">
                                <input id="editStore" class="swal2-input" placeholder="Store" value="${receipt.store || ''}">
                                <input id="editDate" class="swal2-input" type="date" value="${receipt.date || ''}">
                            `,
                            focusConfirm: false,
                            preConfirm: () => {
                                return {
                                    product_name: document.getElementById('editProductName').value,
                                    price: parseFloat(document.getElementById('editPrice').value),
                                    store: document.getElementById('editStore').value,
                                    date: document.getElementById('editDate').value
                                };
                            }
                        }).then((result) => {
                            if (result.isConfirmed) {
                                receipt.purchases[j] = {
                                    product_name: result.value.product_name,
                                    price: result.value.price
                                };
                                receipt.store = result.value.store;
                                receipt.date = result.value.date;
                                
                                // Recalculate total for the receipt
                                receipt.total = receipt.purchases.reduce((sum, purchase) => sum + purchase.price, 0);
                                
                                localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
                                loadItems();
                            }
                        });
                        return; // Exit the function after editing
                    }
                    allItems.push({...receipt.purchases[j], store: receipt.store, date: receipt.date});
                }
            }
        }

        if (!itemFound) {
            Swal.fire('Error', 'Item not found', 'error');
        }
    };

    window.deleteItem = function(index) {
        Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        }).then((result) => {
            if (result.isConfirmed) {
                const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
                let allItems = [];
                receiptHistory.forEach(receipt => {
                    if (receipt.purchases && Array.isArray(receipt.purchases)) {
                        receipt.purchases.forEach(purchase => {
                            allItems.push({
                                ...purchase,
                                store: receipt.store,
                                date: receipt.date
                            });
                        });
                    }
                });

                const itemToDelete = allItems[index];

                // Remove the item from the receipt history
                for (let i = 0; i < receiptHistory.length; i++) {
                    const purchaseIndex = receiptHistory[i].purchases.findIndex(p => 
                        p.product_name === itemToDelete.product_name && p.price === itemToDelete.price);
                    if (purchaseIndex !== -1) {
                        receiptHistory[i].purchases.splice(purchaseIndex, 1);
                        if (receiptHistory[i].purchases.length === 0) {
                            receiptHistory.splice(i, 1);
                        }
                        break;
                    }
                }

                localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
                loadItems();
                Swal.fire('Deleted!', 'The item has been deleted.', 'success');
            }
        });
    };

    window.addManualItem = function() {
        Swal.fire({
            title: 'Add Item Manually',
            html: `
                <input type="text" id="manualProductName" class="swal2-input" placeholder="Product Name">
                <input type="number" id="manualPrice" class="swal2-input" placeholder="Price">
                <input type="text" id="manualStore" class="swal2-input" placeholder="Store">
                <input type="date" id="manualDate" class="swal2-input">
            `,
            showCancelButton: true,
            confirmButtonText: 'Add',
            preConfirm: () => {
                return {
                    product_name: document.getElementById('manualProductName').value,
                    price: document.getElementById('manualPrice').value,
                    store: document.getElementById('manualStore').value,
                    date: document.getElementById('manualDate').value
                };
            }
        }).then((result) => {
            if (result.isConfirmed) {
                const { product_name, price, store, date } = result.value;
                if (product_name && price) {
                    const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
                    let existingReceipt = receiptHistory.find(r => r.store === store && r.date === date);
                    
                    if (existingReceipt) {
                        existingReceipt.purchases.push({ product_name, price });
                    } else {
                        receiptHistory.push({
                            store,
                            date,
                            total: price, // Initialize total with the price of the first item
                            purchases: [{ product_name, price }]
                        });
                    }
                    
                    localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
                    loadItems();
                }
            }
        });
    };

    window.clearAllItems = function() {
        Swal.fire({
            title: 'Are you sure?',
            text: "This will delete all items. You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete all!'
        }).then((result) => {
            if (result.isConfirmed) {
                localStorage.removeItem('receiptHistory');
                allItems = [];
                currentPage = 1;
                displayItems();
                setupPagination();
                Swal.fire(
                    'Deleted!',
                    'All items have been deleted.',
                    'success'
                );
            }
        });
    };
});