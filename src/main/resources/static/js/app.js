

// Variables for exchange rates and selected currency
let exchangeRates = {
    RON: 1, // Base currency
    EUR: null,
    USD: null
};
let selectedCurrency = 'RON';

// Add this function near the top of your app.js file, after the exchangeRates and selectedCurrency variables

function convertCurrency(amount) {
    if (typeof amount !== 'number') {
        amount = parseFloat(amount);
    }
    if (isNaN(amount)) {
        console.error('Invalid amount for currency conversion:', amount);
        return 0;
    }
    
    switch (selectedCurrency) {
        case 'RON':
            return amount;
        case 'EUR':
            return amount * exchangeRates.EUR;
        case 'USD':
            return amount * exchangeRates.USD;
        default:
            console.error('Unsupported currency:', selectedCurrency);
            return amount;
    }
}

// Function to fetch exchange rates from FreeCurrencyAPI
function fetchExchangeRates() {
    const apiKey = 'fca_live_7g7KKdJJfBNXHtBCjGa2KhL4gKiRr6luhKtp0qIt'; // Replace with your actual API key
    const url = `https://api.freecurrencyapi.com/v1/latest?apikey=${apiKey}&base_currency=RON&currencies=EUR,USD`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            exchangeRates.EUR = data.data.EUR;
            exchangeRates.USD = data.data.USD;
            // Update totals after fetching exchange rates
            updateHistoryDisplay();
        })
        .catch(error => {
            console.error('Error fetching exchange rates:', error);
            // Set default rates in case of error
            exchangeRates.EUR = 1 / 4.95; // Approximate rate
            exchangeRates.USD = 1 / 4.5;  // Approximate rate
            updateHistoryDisplay();
        });
}

// Event listener for currency selection change
document.getElementById('currencySelect').addEventListener('change', function() {
    selectedCurrency = this.value;
    updateHistoryDisplay();
    updateCharts();
});

// Function to trigger the file input when clicking on the upload area
function triggerFileInput() {
    document.getElementById('imageInput').click();
}

// Event listener for file input change to show image preview
document.getElementById('imageInput').addEventListener('change', function() {
    const imageInput = this.files[0];
    if (imageInput) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById('previewContainer');
            const imagePreview = document.getElementById('imagePreview');
            imagePreview.src = e.target.result;
            previewContainer.classList.remove('hidden');
        };
        reader.readAsDataURL(imageInput);
    }
});

// Function to process the uploaded image
function processImage() {
    const imageInput = document.getElementById('imageInput').files[0];
    if (!imageInput) {
        Swal.fire({
            title: 'Oops!',
            text: 'Please upload an image',
            icon: 'warning',
            confirmButtonText: 'OK',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm-button'
            }
        });
        return;
    }

    // Check the image size
    const imageSizeMB = imageInput.size / (1024 * 1024); // Convert size to MB
    if (imageSizeMB > 5) {
    //     // Resize the image if larger than 5 MB
    //     resizeImage(imageInput, 1024, 768, (resizedImage) => {
    //         uploadImageToMyApi(resizedImage);
    //     });
    } else {
        // If image size is within limit, process it directly
        uploadImageToMyApi(imageInput);
    }
}

// Function to upload image directly to your API
function uploadImageToMyApi(imageFile) {
    let apiResponseReceived = false;

    // Show initial processing alert
    Swal.fire({
        title: 'Processing...',
        text: 'Please wait',
        icon: 'info',
        showConfirmButton: false,
        timer: 20000,
        timerProgressBar: true,
        didOpen: () => {
            Swal.showLoading();
            const apiTimeout = setTimeout(() => {
                if (!apiResponseReceived) {
                    Swal.close();
                    Swal.fire({
                        title: 'API Unavailable',
                        text: 'The API is not available. Please try again or wait for the connection to be restored',
                        icon: 'warning',
                        showCancelButton: true,
                        cancelButtonText: 'Later',
                        customClass: {
                            popup: 'swal-custom-popup',
                            title: 'swal-custom-title',
                            content: 'swal-custom-content',
                            cancelButton: 'swal-custom-cancel-button'
                        }
                    })
                }
            }, 20000);
        }
    });

    // Create a new FormData object
    const formData = new FormData();
    formData.append("image", imageFile); // Ensure the key matches your API's expected field name

    // Make the API call to your API
    fetch("http://localhost:8080/api/ollama/generate", {
        method: "POST",
        body: formData
    })
    .then(response => {
        apiResponseReceived = true;
        Swal.close();
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.text(); // Get the response as text instead of JSON
    })
    .then(text => {
        // Sanitize the JSON string
        const sanitizedText = text.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
        
        try {
            const data = JSON.parse(sanitizedText);
            console.log("API Response:", JSON.stringify(data, null, 2));
            if (data && typeof data === 'object') {
                extractTotalFromApiResponse(data);
            } else {
                throw new Error("Unexpected API response structure");
            }
        } catch (error) {
            console.error("Error parsing API response:", error);
            Swal.fire('Error', 'Unable to process the API response', 'error');
        }
    })
    .catch(error => {
        console.error('Error with your API:', error);
        Swal.fire('Error', 'There was a problem processing your image. Please try again.', 'error');
    });
}

// Function to resize the image to be under 5 MB
function resizeImage(imageFile, maxWidth, maxHeight, callback) {
    const reader = new FileReader();

    reader.onload = function(event) {
        const img = new Image();
        img.src = event.target.result;

        img.onload = function() {
            let width = img.width;
            let height = img.height;
            let quality = 0.9; // Start with high quality

            // Calculate the scaling factor to maintain aspect ratio
            if (width > maxWidth || height > maxHeight) {
                if (width > height) {
                    height *= maxWidth / width;
                    width = maxWidth;
                } else {
                    width *= maxHeight / height;
                    height = maxHeight;
                }
            }

            // Create a canvas to resize the image
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');

            // Function to resize and check the file size
            function resizeAndCheckSize() {
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // Convert the resized image to a blob
                canvas.toBlob((blob) => {
                    if (blob.size <= 5 * 1024 * 1024 || quality <= 0.1) { // 5 MB in bytes
                        callback(new File([blob], imageFile.name, { type: imageFile.type }));
                    } else {
                        // Reduce quality and try again
                        quality -= 0.1;
                        resizeAndCheckSize();
                    }
                }, imageFile.type, quality);
            }

            resizeAndCheckSize();
        };
    };

    reader.readAsDataURL(imageFile);
}

// Function to send OCR text to your API and handle the response
function sendOcrTextToApi(ocrText) {
    fetch("http://localhost:8080/api/ollama/generate", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ ocrText: ocrText }) // Send as JSON
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => {
        console.log("API Response:", data);
        extractTotalFromApiResponse(data); // Extract total from API response
    })
    .catch(error => {
        console.error("Error with your API:", error);
        Swal.fire({
            title: 'Error!',
            text: 'Failed to process OCR text with your API.',
            icon: 'error',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm-button'
            }
        });
    });
}

// Function to extract total and other details from your API response
function extractTotalFromApiResponse(apiResponse) {
    console.log("API Response:", apiResponse);

    const receiptData = {
        store: apiResponse.store || 'Unknown Store',
        store_category: apiResponse.store_category || 'Unknown Category',
        date: new Date().toISOString().split('T')[0], // Default to today's date
        total: 0,
        purchases: []
    };

    // Try to extract a valid date from the date string
    if (apiResponse.date) {
        const dateMatch = apiResponse.date.match(/(\d{2}\.\d{2})/);
        if (dateMatch) {
            const [day, month] = dateMatch[1].split('.');
            const year = new Date().getFullYear(); // Assume current year
            receiptData.date = `${year}-${month}-${day}`;
        }
    }

    // Extract the numeric value from the total string
    if (typeof apiResponse.total === 'string') {
        const totalMatch = apiResponse.total.match(/(\d+(\.\d+)?)/);
        if (totalMatch) {
            receiptData.total = parseFloat(totalMatch[1]);
        }
    }

    // Process purchases
    if (Array.isArray(apiResponse.purchases)) {
        receiptData.purchases = apiResponse.purchases.map(purchase => {
            let price = 0;
            if (typeof purchase.price === 'string') {
                const priceMatch = purchase.price.match(/(\d+(\.\d+)?)/);
                if (priceMatch) {
                    price = parseFloat(priceMatch[1]);
                }
            }
            return {
                product_name: purchase.product_name || 'Unknown Product',
                price: price
            };
        });
    }

    console.log("Extracted Receipt Data:", receiptData);
    showEditableForm(receiptData);
}

// Function to save the total to history using localStorage, including date and time
function saveTotalToHistory(total, timestamp, date, store, category) {
    let history = JSON.parse(localStorage.getItem('totalHistory')) || [];
    history.push({ total, timestamp, date, store, category });
    localStorage.setItem('totalHistory', JSON.stringify(history));
    calculateOverallTotal();
}

// Function to get spending data grouped by day, week, and month
function getSpendingData() {
    let history = JSON.parse(localStorage.getItem('totalHistory')) || [];
    let dailyData = {};
    let weeklyData = {};
    let monthlyData = {};

    history.forEach(entry => {
        const date = new Date(entry.date);
        const total = parseFloat(entry.total);

        // Daily Data
        dailyData[entry.date] = (dailyData[entry.date] || 0) + total;

        // Weekly Data (ISO Week Number)
        const weekNumber = getWeekNumber(date);
        const weekKey = `${date.getFullYear()}-W${weekNumber}`;
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + total;

        // Monthly Data
        const monthKey = `${date.getFullYear()}-${(date.getMonth() + 1)
            .toString()
            .padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + total;
    });

    return { dailyData, weeklyData, monthlyData };
}

// Helper function to get ISO week number
function getWeekNumber(date) {
    const tempDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayNum = tempDate.getDay() || 7;
    tempDate.setDate(tempDate.getDate() + 4 - dayNum);
    const yearStart = new Date(tempDate.getFullYear(), 0, 1);
    return Math.ceil(((tempDate - yearStart) / 86400000 + 1) / 7);
}

// Function to create charts
function createCharts() {
    const { dailyData, weeklyData, monthlyData } = getSpendingData();

    // Get the exchange rate for the selected currency
    const rate = exchangeRates[selectedCurrency];

    // Destroy existing charts if they exist
    if (window.monthlyChart instanceof Chart) {
        window.monthlyChart.destroy();
    }
    if (window.weeklyChart instanceof Chart) {
        window.weeklyChart.destroy();
    }
    if (window.dailyChart instanceof Chart) {
        window.dailyChart.destroy();
    }

    // Monthly Chart
    const monthlyLabels = Object.keys(monthlyData).sort();
    const monthlyTotals = monthlyLabels.map(label => (monthlyData[label] * rate).toFixed(2));

    const ctxMonthly = document.getElementById('monthlyChart').getContext('2d');
    window.monthlyChart = new Chart(ctxMonthly, {
        type: 'bar',
        data: {
            labels: monthlyLabels,
            datasets: [
                {
                    label: `Monthly Spending (${selectedCurrency})`,
                    data: monthlyTotals,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)',
                },
            ],
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Month' } },
                y: { title: { display: true, text: `Amount (${selectedCurrency})` } },
            },
        },
    });

    // Weekly Chart
    const weeklyLabels = Object.keys(weeklyData).sort();
    const weeklyTotals = weeklyLabels.map(label => (weeklyData[label] * rate).toFixed(2));

    const ctxWeekly = document.getElementById('weeklyChart').getContext('2d');
    window.weeklyChart = new Chart(ctxWeekly, {
        type: 'line',
        data: {
            labels: weeklyLabels,
            datasets: [
                {
                    label: `Weekly Spending (${selectedCurrency})`,
                    data: weeklyTotals,
                    backgroundColor: 'rgba(153, 102, 255, 0.6)',
                    fill: false,
                    borderColor: 'rgba(153, 102, 255, 1)',
                    tension: 0.1,
                },
            ],
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Week' } },
                y: { title: { display: true, text: `Amount (${selectedCurrency})` } },
            },
        },
    });

    // Daily Chart
    const dailyLabels = Object.keys(dailyData).sort();
    const dailyTotals = dailyLabels.map(label => (dailyData[label] * rate).toFixed(2));

    const ctxDaily = document.getElementById('dailyChart').getContext('2d');
    window.dailyChart = new Chart(ctxDaily, {
        type: 'bar',
        data: {
            labels: dailyLabels,
            datasets: [
                {
                    label: `Daily Spending (${selectedCurrency})`,
                    data: dailyTotals,
                    backgroundColor: 'rgba(255, 159, 64, 0.6)',
                },
            ],
        },
        options: {
            scales: {
                x: { title: { display: true, text: 'Date' } },
                y: { title: { display: true, text: `Amount (${selectedCurrency})` } },
            },
        },
    });
    updateStoreChart(document.getElementById('storePeriodSelect').value);

}

// Function to delete a specific entry from history
function deleteHistoryEntry(index) {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        customClass: {
            popup: 'swal-custom-popup',
            title: 'swal-custom-title',
            content: 'swal-custom-content',
            confirmButton: 'swal-custom-confirm-button',
            cancelButton: 'swal-custom-cancel-button'
        }
    }).then((result) => {
        if (result.isConfirmed) {
            let history = JSON.parse(localStorage.getItem('totalHistory')) || [];
            history.splice(index, 1);
            localStorage.setItem('totalHistory', JSON.stringify(history));
            updateHistoryDisplay();
            Swal.fire({
                title: 'Deleted!',
                text: 'The entry has been deleted.',
                icon: 'success',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    content: 'swal-custom-content',
                    confirmButton: 'swal-custom-confirm-button'
                }
            });
        }
    });
}

function clearHistory() {
    Swal.fire({
        title: 'Are you sure?',
        text: "You're about to clear all history. This cannot be undone!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, clear it!'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.removeItem('receiptHistory');
            updateHistoryDisplay();
            Swal.fire(
                'Cleared!',
                'Your history has been cleared.',
                'success'
            );
        }
    });
}

// Updated function to display history and calculate the overall total
function updateHistoryDisplay() {
    let receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const historyList = document.getElementById('historyList');
    historyList.innerHTML = '';

    if (receiptHistory.length === 0) {
        historyList.innerHTML = '<li class="history-item">No receipts in history</li>';
    } else {
        receiptHistory.forEach((receipt, index) => {
            const convertedTotal = convertCurrency(receipt.total);
            const listItem = document.createElement('li');
            listItem.className = 'history-item';
            listItem.innerHTML = `
                <div class="history-content">
                    <p><strong>Amount:</strong> ${convertedTotal.toFixed(2)} ${selectedCurrency}</p>
                    <p><strong>Date:</strong> ${receipt.date}</p>
                    <p><strong>Store:</strong> ${receipt.store}</p>
                    <p><strong>Category:</strong> ${receipt.category || 'N/A'}</p>
                </div>
                <div class="history-actions">
                    <button class="edit-btn" onclick="editReceiptHistoryEntry(${index})">Edit</button>
                    <button class="delete-btn" onclick="deleteReceiptHistoryEntry(${index})">Delete</button>
                </div>
            `;
            historyList.appendChild(listItem);
        });
    }

    calculateOverallTotal();
    updateCharts();
}

function calculateOverallTotal() {
    let receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    let overallTotal = 0;

    receiptHistory.forEach(entry => {
        overallTotal += parseFloat(entry.total);
    });

    const rate = exchangeRates[selectedCurrency];
    const convertedTotal = (overallTotal * rate).toFixed(2);

    document.getElementById('overallTotalAmount').innerText = `Overall Total: ${convertedTotal} ${selectedCurrency}`;
}
// Initialize history display on page load
window.onload = function() {
    fetchExchangeRates();
    // Hide preview container if no image is loaded
    document.getElementById('previewContainer').classList.add('hidden');
};

// Dark mode toggle functionality
const darkModeToggle = document.getElementById('darkModeToggle');
const body = document.body;

darkModeToggle.addEventListener('click', () => {
  body.classList.toggle('dark-mode');
  
  // Update icon
  const icon = darkModeToggle.querySelector('i');
  if (body.classList.contains('dark-mode')) {
    icon.classList.remove('fa-moon');
    icon.classList.add('fa-sun');
  } else {
    icon.classList.remove('fa-sun');
    icon.classList.add('fa-moon');
  }

  // Save preference to localStorage
  localStorage.setItem('darkMode', body.classList.contains('dark-mode'));
});

// Check for saved dark mode preference on page load
document.addEventListener('DOMContentLoaded', () => {
  const savedDarkMode = localStorage.getItem('darkMode');
  if (savedDarkMode === 'true') {
    body.classList.add('dark-mode');
    darkModeToggle.querySelector('i').classList.replace('fa-moon', 'fa-sun');
  }
});

// Wait for the DOM to be fully loaded before attaching event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Event listener for manual entry button
    const manualEntryBtn = document.getElementById('manualEntryBtn');
    if (manualEntryBtn) {
        manualEntryBtn.addEventListener('click', function() {
            Swal.fire({
                title: 'Enter Expense Manually',
                html:
                    '<div class="form-group">' +
                    '<label for="manualAmount">Amount:</label>' +
                    '<input type="number" id="manualAmount" class="swal2-input" step="0.01" required>' +
                    '</div>' +
                    '<div class="form-group">' +
                    '<label for="manualDate">Date:</label>' +
                    '<input type="date" id="manualDate" class="swal2-input" required>' +
                    '</div>',
                focusConfirm: false,
                showCancelButton: true,
                confirmButtonText: 'Add Expense',
                customClass: {
                    popup: 'swal-custom-popup',
                    title: 'swal-custom-title',
                    confirmButton: 'swal-custom-confirm-button',
                    cancelButton: 'swal-custom-cancel-button'
                },
                preConfirm: () => {
                    const amount = document.getElementById('manualAmount').value;
                    const date = document.getElementById('manualDate').value;
                    return { amount: amount, date: date, store: "Manual entry", category: "Manual Entry" }
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    handleManualEntry(result.value.amount, result.value.date);
                }
            });
        });
    } else {
        console.error('Manual entry button not found');
    }
});

// Function to handle manual entry submission
function handleManualEntry(amount, date) {
    amount = parseFloat(amount);
    
    if (isNaN(amount) || amount <= 0) {
        Swal.fire({
            title: 'Invalid Amount',
            text: 'Please enter a valid positive number for the amount.',
            icon: 'error',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm-button'
            }
        });
        return;
    }

    const selectedDate = new Date(date);
    const today = new Date();

    if (selectedDate > today) {
        Swal.fire({
            title: 'Invalid Date',
            text: 'You cannot add expenses for future dates.',
            icon: 'error',
            customClass: {
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                content: 'swal-custom-content',
                confirmButton: 'swal-custom-confirm-button'
            }
        });
        return;
    }

    const timestamp = selectedDate.toLocaleString();
    
    saveTotalToHistory(amount.toFixed(2), timestamp, date);
    updateHistoryDisplay();

    Swal.fire({
        title: 'Expense Added',
        text: `An expense of ${amount.toFixed(2)} ${selectedCurrency} has been added.`,
        icon: 'success',
        customClass: {
            popup: 'swal-custom-popup',
            title: 'swal-custom-title',
            content: 'swal-custom-content',
            confirmButton: 'swal-custom-confirm-button'
        }
    });
    // Update the history display
    updateHistoryDisplay();
}

// Add this near the top of your app.js file, after your existing event listeners
function extractStoreAndCategory(text) {
    const { store, category } = determineStoreAndCategory(text);
    console.log(`Detected store: ${store}, Category: ${category}`);
    return { store, category };
}

function determineStoreAndCategory(receiptText) {
    const lowerCaseText = receiptText.toLowerCase();

    // Define an object with store names, their identifying keywords, and categories
    const storeInfo = {
        'Carrefour': { keywords: ['carrefour', 'carrefour market', 'carrefour express'], category: 'Groceries' },
        'Kaufland': { keywords: ['kaufland'], category: 'Groceries' },
        'Lidl': { keywords: ['lidl'], category: 'Groceries' },
        'Mega Image': { keywords: ['mega image', 'mega'], category: 'Groceries' },
        'Auchan': { keywords: ['auchan'], category: 'Groceries' },
        'Profi': { keywords: ['profi'], category: 'Groceries' },
        'Penny': { keywords: ['penny', 'penny market'], category: 'Groceries' },
        'Cora': { keywords: ['cora'], category: 'Groceries' },
        'Metro': { keywords: ['metro'], category: 'Groceries' },
        'Selgros': { keywords: ['selgros'], category: 'Groceries' },
        'McDonald\'s': { keywords: ['mcdonald', 'mcdonalds'], category: 'Restaurants' },
        'KFC': { keywords: ['kfc'], category: 'Restaurants' },
        'Subway': { keywords: ['subway'], category: 'Restaurants' },
        'H&M': { keywords: ['h&m', 'h & m'], category: 'Clothing' },
        'Zara': { keywords: ['zara'], category: 'Clothing' },
        'Decathlon': { keywords: ['decathlon'], category: 'Sporting Goods' },
        'Emag': { keywords: ['emag'], category: 'Electronics' },
        'Altex': { keywords: ['altex'], category: 'Electronics' },
        'Flanco': { keywords: ['flanco'], category: 'Electronics' },
        // Add more stores and categories as needed
    };

    // Check for each store's keywords in the receipt text
    for (const [storeName, info] of Object.entries(storeInfo)) {
        if (info.keywords.some(keyword => lowerCaseText.includes(keyword))) {
            return { store: storeName, category: info.category };
        }
    }

    // If no match is found, try to determine category based on keywords
    const categoryKeywords = {
        'Groceries': ['food', 'grocery', 'supermarket', 'market', 'fruit', 'vegetable'],
        'Restaurants': ['restaurant', 'cafe', 'coffee', 'bistro', 'diner'],
        'Clothing': ['clothing', 'apparel', 'fashion', 'wear', 'dress', 'shirt'],
        'Electronics': ['electronics', 'tech', 'computer', 'phone', 'laptop'],
        'Transportation': ['gas', 'fuel', 'petrol', 'transport', 'taxi', 'uber'],
        'Utilities': ['electricity', 'water', 'gas', 'internet', 'phone bill'],
        'Entertainment': ['cinema', 'movie', 'theatre', 'concert', 'show'],
        'Health': ['pharmacy', 'drug', 'medicine', 'doctor', 'hospital'],
        // Add more categories and keywords as needed
    };

    for (const [category, keywords] of Object.entries(categoryKeywords)) {
        if (keywords.some(keyword => lowerCaseText.includes(keyword))) {
            return { store: 'Unknown', category: category };
        }
    }

    // If still no match, return unknown for both
    return { store: 'Unknown', category: 'Miscellaneous' };
}

function getStoreSpendingData(period) {
    let history = JSON.parse(localStorage.getItem('totalHistory')) || [];
    let storeData = {};
    let currentDate = new Date();

    history.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (period === 'day' && entryDate.toDateString() === currentDate.toDateString()) {
            addToStoreData(storeData, entry);
        } else if (period === 'week' && isWithinLastWeek(entryDate, currentDate)) {
            addToStoreData(storeData, entry);
        } else if (period === 'month' && entryDate.getMonth() === currentDate.getMonth() && entryDate.getFullYear() === currentDate.getFullYear()) {
            addToStoreData(storeData, entry);
        }
    });
console.log(storeData);
    return storeData;
}

function addToStoreData(storeData, entry) {
    const storeName = entry.store || 'Manual Entry';
    if (!storeData[storeName]) {
        storeData[storeName] = 0;
    }
    storeData[storeName] += parseFloat(entry.total);
}

function isWithinLastWeek(date, currentDate) {
    const oneWeekAgo = new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date >= oneWeekAgo && date <= currentDate;
}

function updateStoreChart(period) {
    const storeData = getStoreSpendingData(period);
    const ctx = document.getElementById('storeChart').getContext('2d');

    if (window.storeChart instanceof Chart) {
        window.storeChart.destroy();
    }

    // Sort the data by total amount spent, descending
    const sortedEntries = Object.entries(storeData).sort((a, b) => b[1] - a[1]);
    const labels = sortedEntries.map(entry => entry[0]);
    const data = sortedEntries.map(entry => entry[1]);

    // Generate colors for each store
    const colors = generateColors(labels.length);

    window.storeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: `Spending by Store (${period})`,
                data: data,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.6', '1')),
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: `Amount (${selectedCurrency})`
                    }
                }
            },
            plugins: {
                legend: {
                    display: false // Hide legend as we have many stores
                }
            }
        }
    });
}

function generateColors(count) {
    const colors = [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 205, 86, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
    ];
    
    // If we need more colors than in our predefined list, generate random ones
    while (colors.length < count) {
        colors.push(`rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
    }

    return colors;
}

document.addEventListener('DOMContentLoaded', function() {
    // Existing event listeners...

    document.getElementById('storePeriodSelect').addEventListener('change', function() {
        updateStoreChart(this.value);
    });
});
// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    const mobileMenu = document.getElementById('mobile-menu');
    const navMenu = document.querySelector('.nav-menu');

    if (mobileMenu && navMenu) {
        mobileMenu.addEventListener('click', function() {
            mobileMenu.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Close menu when a nav item is clicked
    const navItems = document.querySelectorAll('.nav-menu a');
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            mobileMenu.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
});

function saveReceiptToHistory(receiptData) {
    let receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    receiptHistory.push(receiptData);
    localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
}

function deleteReceiptHistoryEntry(index) {
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
            let receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
            receiptHistory.splice(index, 1);
            localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
            updateHistoryDisplay();
            Swal.fire(
                'Deleted!',
                'The receipt has been removed from history.',
                'success'
            );
        }
    });
}

function showEditableForm(receiptData) {
    Swal.fire({
        title: 'Review and Edit Receipt Details',
        html: `
            <div class="form-group">
                <label for="editStore">Store:</label>
                <input id="editStore" class="swal2-input" value="${receiptData.store}">
            </div>
            <div class="form-group">
                <label for="editCategory">Category:</label>
                <input id="editCategory" class="swal2-input" value="${receiptData.store_category}">
            </div>
            <div class="form-group">
                <label for="editDate">Date:</label>
                <input id="editDate" class="swal2-input" type="date" value="${receiptData.date}">
            </div>
            <div class="form-group">
                <label for="editTotal">Total:</label>
                <input id="editTotal" class="swal2-input" type="number" step="0.01" value="${receiptData.total}">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        preConfirm: () => {
            return {
                store: document.getElementById('editStore').value,
                store_category: document.getElementById('editCategory').value,
                date: document.getElementById('editDate').value || new Date().toISOString().split('T')[0],
                total: parseFloat(document.getElementById('editTotal').value) || 0,
                purchases: receiptData.purchases // Keep the original purchases without editing
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const editedData = result.value;
            saveReceiptToHistory(editedData);
            updateHistoryDisplay();
            showSuccessMessage(editedData);
        }
    });
}

function showSuccessMessage(data) {
    Swal.fire({
        title: 'Receipt Saved',
        html: `
            <p><strong>Store:</strong> ${data.store}</p>
            <p><strong>Category:</strong> ${data.store_category}</p>
            <p><strong>Date:</strong> ${data.date}</p>
            <p><strong>Total:</strong> ${data.total} RON</p>
        `,
        icon: 'success'
    });
}

function updateCharts() {
    updateMonthlyChart();
    updateWeeklyChart();
    updateDailyChart();
    updateStoreChart();
}

function updateMonthlyChart() {
    const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const monthlyData = {};

    receiptHistory.forEach(receipt => {
        const month = receipt.date.substring(0, 7); // YYYY-MM
        monthlyData[month] = (monthlyData[month] || 0) + convertCurrency(receipt.total);
    });

    const labels = Object.keys(monthlyData).sort();
    const data = labels.map(month => monthlyData[month]);

    const ctx = document.getElementById('monthlyChart');
    if (!ctx) {
        console.error('Monthly chart canvas not found');
        return;
    }

    if (window.monthlyChart instanceof Chart) {
        window.monthlyChart.data.labels = labels;
        window.monthlyChart.data.datasets[0].data = data;
        window.monthlyChart.options.scales.y.title.text = `Amount (${selectedCurrency})`;
        window.monthlyChart.update();
    } else {
        window.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Monthly Spending (${selectedCurrency})`,
                    data: data,
                    backgroundColor: 'rgba(75, 192, 192, 0.6)'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Amount (${selectedCurrency})`
                        }
                    }
                }
            }
        });
    }
}

function updateWeeklyChart() {
    const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const weeklyData = {};

    receiptHistory.forEach(receipt => {
        const date = new Date(receipt.date);
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay())); // Start of the week (Sunday)
        const weekKey = weekStart.toISOString().split('T')[0]; // YYYY-MM-DD of the week start
        weeklyData[weekKey] = (weeklyData[weekKey] || 0) + convertCurrency(receipt.total);
    });

    const labels = Object.keys(weeklyData).sort();
    const data = labels.map(week => weeklyData[week]);

    const ctx = document.getElementById('weeklyChart');
    if (!ctx) {
        console.error('Weekly chart canvas not found');
        return;
    }

    if (window.weeklyChart instanceof Chart) {
        window.weeklyChart.data.labels = labels;
        window.weeklyChart.data.datasets[0].data = data;
        window.weeklyChart.options.scales.y.title.text = `Amount (${selectedCurrency})`;
        window.weeklyChart.update();
    } else {
        window.weeklyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: `Weekly Spending (${selectedCurrency})`,
                    data: data,
                    backgroundColor: 'rgba(54, 162, 235, 0.6)'
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Amount (${selectedCurrency})`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Week Start Date'
                        }
                    }
                }
            }
        });
    }
}

function updateDailyChart() {
    const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const dailyData = {};

    receiptHistory.forEach(receipt => {
        const date = receipt.date; // Assuming date is already in YYYY-MM-DD format
        dailyData[date] = (dailyData[date] || 0) + convertCurrency(receipt.total);
    });

    const labels = Object.keys(dailyData).sort();
    const data = labels.map(day => dailyData[day]);

    const ctx = document.getElementById('dailyChart');
    if (!ctx) {
        console.error('Daily chart canvas not found');
        return;
    }

    if (window.dailyChart instanceof Chart) {
        window.dailyChart.data.labels = labels;
        window.dailyChart.data.datasets[0].data = data;
        window.dailyChart.options.scales.y.title.text = `Amount (${selectedCurrency})`;
        window.dailyChart.update();
    } else {
        window.dailyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `Daily Spending (${selectedCurrency})`,
                    data: data,
                    borderColor: 'rgba(255, 99, 132, 1)',
                    backgroundColor: 'rgba(255, 99, 132, 0.2)',
                    fill: true
                }]
            },
            options: {
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: `Amount (${selectedCurrency})`
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Date'
                        }
                    }
                }
            }
        });
    }
}

function updateStoreChart() {
    const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const storeData = {};

    receiptHistory.forEach(receipt => {
        storeData[receipt.store] = (storeData[receipt.store] || 0) + convertCurrency(receipt.total);
    });

    const labels = Object.keys(storeData);
    const data = labels.map(store => storeData[store]);

    const ctx = document.getElementById('storeChart');
    if (!ctx) {
        console.error('Store chart canvas not found');
        return;
    }

    if (window.storeChart instanceof Chart) {
        window.storeChart.data.labels = labels;
        window.storeChart.data.datasets[0].data = data;
        window.storeChart.options.plugins.title.text = `Spending by Store (${selectedCurrency})`;
        window.storeChart.update();
    } else {
        window.storeChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: generateColors(labels.length)
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: `Spending by Store (${selectedCurrency})`
                    }
                }
            }
        });
    }
}

function generateColors(count) {
    const colors = [
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 206, 86, 0.6)',
        'rgba(75, 192, 192, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
    ];
    while (colors.length < count) {
        colors.push(`rgba(${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, ${Math.floor(Math.random() * 255)}, 0.6)`);
    }
    return colors;
}

function editReceiptHistoryEntry(index) {
    let receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    const receipt = receiptHistory[index];

    Swal.fire({
        title: 'Edit Receipt',
        html: `
            <input id="swal-input-store" class="swal2-input" placeholder="Store" value="${receipt.store}">
            <input id="swal-input-category" class="swal2-input" placeholder="Category" value="${receipt.category || ''}">
            <input id="swal-input-date" class="swal2-input" type="date" value="${receipt.date}">
            <input id="swal-input-total" class="swal2-input" type="number" step="0.01" placeholder="Total" value="${receipt.total}">
        `,
        focusConfirm: false,
        preConfirm: () => {
            return {
                store: document.getElementById('swal-input-store').value,
                category: document.getElementById('swal-input-category').value,
                date: document.getElementById('swal-input-date').value,
                total: parseFloat(document.getElementById('swal-input-total').value)
            }
        }
    }).then((result) => {
        if (result.isConfirmed) {
            receiptHistory[index] = result.value;
            localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
            updateHistoryDisplay();
            Swal.fire('Updated!', 'The receipt has been updated.', 'success');
        }
    });
}

window.addManualItem = function() {
    Swal.fire({
        title: 'Add Item Manually',
        html: `
            <input type="text" id="manualProductName" class="swal2-input" placeholder="Product Name">
            <input type="number" id="manualPrice" class="swal2-input" placeholder="Price">
            <input type="text" id="manualStore" class="swal2-input" placeholder="Store">
            <input type="text" id="manualCategory" class="swal2-input" placeholder="Category (optional)">
            <input type="date" id="manualDate" class="swal2-input">
        `,
        showCancelButton: true,
        confirmButtonText: 'Add',
        preConfirm: () => {
            return {
                product_name: document.getElementById('manualProductName').value,
                price: parseFloat(document.getElementById('manualPrice').value),
                store: document.getElementById('manualStore').value,
                category: document.getElementById('manualCategory').value || null,
                date: document.getElementById('manualDate').value
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            const { product_name, price, store, category, date } = result.value;
            if (product_name && price && store && date) {
                const receiptHistory = JSON.parse(localStorage.getItem('receiptHistory')) || [];
                let existingReceipt = receiptHistory.find(r => r.store === store && r.date === date);
                
                if (existingReceipt) {
                    existingReceipt.purchases.push({ product_name, price });
                    existingReceipt.total = existingReceipt.purchases.reduce((sum, item) => sum + item.price, 0);
                    if (category && !existingReceipt.category) {
                        existingReceipt.category = category;
                    }
                } else {
                    receiptHistory.push({
                        store,
                        category,
                        date,
                        total: price,
                        purchases: [{ product_name, price }]
                    });
                }
                
                localStorage.setItem('receiptHistory', JSON.stringify(receiptHistory));
                updateHistoryDisplay();
                Swal.fire('Added!', 'The item has been added to the receipt history.', 'success');
            } else {
                Swal.fire('Error', 'Please fill in all required fields.', 'error');
            }
        }
    });
};