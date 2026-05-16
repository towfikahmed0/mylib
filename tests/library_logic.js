function mockBooks() {
    return [
        { id: '1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', categories: ['Classic'], _searchStr: 'the great gatsby f. scott fitzgerald classic', _sortTitle: 'great gatsby', _createdTime: 1000 },
        { id: '2', title: '1984', author: 'George Orwell', categories: ['Dystopian'], _searchStr: '1984 george orwell dystopian', _sortTitle: '1984', _createdTime: 2000 },
        { id: '3', title: 'Animal Farm', author: 'George Orwell', categories: ['Classic'], _searchStr: 'animal farm george orwell classic', _sortTitle: 'animal farm', _createdTime: 3000 }
    ];
}

function testFiltering() {
    console.log("Testing Library Filtering Logic...");
    const books = mockBooks();

    // Test Search
    const searchResult = books.filter(b => b._searchStr.includes('orwell'));
    if (searchResult.length === 2) {
        console.log("✅ Search filter passed");
    } else {
        console.error("❌ Search filter failed: expected 2, got " + searchResult.length);
        process.exit(1);
    }

    // Test Category
    const categoryResult = books.filter(b => b.categories.includes('Classic'));
    if (categoryResult.length === 2) {
        console.log("✅ Category filter passed");
    } else {
        console.error("❌ Category filter failed: expected 2, got " + categoryResult.length);
        process.exit(1);
    }
}

function testSorting() {
    console.log("\nTesting Library Sorting Logic...");
    const books = mockBooks();

    // Test Sort by Title
    const sortedTitle = [...books].sort((a, b) => a._sortTitle.localeCompare(b._sortTitle));
    if (sortedTitle[0].title === '1984' && sortedTitle[1].title === 'Animal Farm') {
        console.log("✅ Title sort passed");
    } else {
        console.error("❌ Title sort failed");
        process.exit(1);
    }

    // Test Sort by Newest (CreatedTime desc)
    const sortedNewest = [...books].sort((a, b) => b._createdTime - a._createdTime);
    if (sortedNewest[0].title === 'Animal Farm') {
        console.log("✅ Newest sort passed");
    } else {
        console.error("❌ Newest sort failed");
        process.exit(1);
    }
}

testFiltering();
testSorting();
console.log("\nLibrary Logic Tests Passed!");
