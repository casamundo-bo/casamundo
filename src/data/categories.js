// Categories and subcategories for the entire application
export const categoryList = [
    {
        name: 'EDREDÓN LISO',
        subcategories: ['TWIN', 'QUEEN', 'KING'],
        showOnHomepage: true
    },
    {
        name: 'EDREDÓN CALAMINADO',
        subcategories: ['QUEEN'],
        showOnHomepage: true
    },
    {
        name: 'EDREDÓN LUMINOSO',
        subcategories: ['TWIN', 'FULL', 'QUEEN', 'KING'],
        showOnHomepage: true
    },
    {
        name: 'EDREDÓN CALAMINADO COLOR ENTERO',
        subcategories: ['FULL'],
        showOnHomepage: true
    },
    {
        name: 'EDREDÓN INFANTIL',
        subcategories: ['TWIN'],
        showOnHomepage: true
    },
    {
        name: 'SABANAS',
        subcategories: ['FULL'],
        showOnHomepage: true
    },
    {
        name: 'LAMINADO GANSO - MANTAS',
        subcategories: ['PLAZA Y MEDIA', 'DOS PLAZAS'],
        showOnHomepage: true
    },
    {
        name: 'LAMINADO LUMINOSO - MANTAS',
        subcategories: ['UNA PLAZA', 'DOS PLAZAS'],
        showOnHomepage: true
    }
];

// Helper function to get categories for homepage
export const getHomepageCategories = () => {
    return categoryList.filter(category => category.showOnHomepage);
};

// Helper function to get all subcategories for a given category
export const getSubcategoriesForCategory = (categoryName) => {
    const category = categoryList.find(cat => cat.name === categoryName);
    return category ? category.subcategories : [];
};