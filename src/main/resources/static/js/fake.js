function generateFakeData(count) {
    const stores = ['RRL GELATO SRL.', 'MEGA IMAGE', 'LIDL', 'KAUFLAND', 'CARREFOUR'];
    const categories = ['confectionery', 'grocery', 'bakery', 'dairy', 'produce'];
    const products = ['Ice Cream', 'Milk', 'Bread', 'Cheese', 'Apples', 'Chocolate', 'Coffee', 'Tea', 'Pasta', 'Rice'];

    function randomDate(start, end) {
        return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    }

    function formatDate(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function randomPrice() {
        return (Math.random() * 100).toFixed(2);
    }

    let fakeData = [];
    const currentDate = new Date();
    const twoYearsAgo = new Date(currentDate.getFullYear() - 2, currentDate.getMonth(), currentDate.getDate());

    for (let i = 0; i < count; i++) {
        let purchaseCount = Math.floor(Math.random() * 5) + 1; // 1 to 5 purchases
        let purchases = [];
        let total = 0;

        for (let j = 0; j < purchaseCount; j++) {
            let price = parseFloat(randomPrice());
            total += price;
            purchases.push({
                product_name: products[Math.floor(Math.random() * products.length)],
                price: price.toFixed(2)
            });
        }

        let date = randomDate(twoYearsAgo, currentDate);

        fakeData.push({
            store: stores[Math.floor(Math.random() * stores.length)],
            store_category: categories[Math.floor(Math.random() * categories.length)],
            date: formatDate(date),
            total: total.toFixed(2),
            purchases: purchases
        });
    }

    // Save to localStorage
    let existingData = JSON.parse(localStorage.getItem('receiptHistory')) || [];
    let updatedData = existingData.concat(fakeData);
    localStorage.setItem('receiptHistory', JSON.stringify(updatedData));

    console.log(`Generated ${count} fake entries and added to localStorage.`);
    return fakeData;
}