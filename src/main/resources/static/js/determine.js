// Function to determine the store name and category from receipt text
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

// Function to extract the store name and category from OCR result
function extractStoreAndCategory(text) {
    const { store, category } = determineStoreAndCategory(text);
    console.log(`Detected store: ${store}, Category: ${category}`);
    return { store, category };
}

// Export the function to be used in other files
export { extractStoreAndCategory };