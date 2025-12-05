document.addEventListener('DOMContentLoaded', function () {
    const filterBtns = document.querySelectorAll('.filter-btn');
    const lotItems = document.querySelectorAll('.lot-item');

    function applyFilter(filterValue) {
        lotItems.forEach(item => {
            const category = item.getAttribute('data-category');
            if (filterValue === 'all') {
                item.style.display = 'block';
            } else if (category === filterValue) {
                item.style.display = 'block';
            } else {
                item.style.display = 'none';
            }
        });
    }

    // Apply initial filter
    const activeBtn = document.querySelector('.filter-btn.active');
    if (activeBtn) {
        applyFilter(activeBtn.getAttribute('data-filter'));
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            // Remove active class from all buttons
            filterBtns.forEach(b => {
                b.classList.remove('active', 'btn-primary');
                b.classList.add('btn-default');
            });

            // Add active class to clicked button
            this.classList.remove('btn-default');
            this.classList.add('active', 'btn-primary');

            const filterValue = this.getAttribute('data-filter');
            applyFilter(filterValue);
        });
    });
});
