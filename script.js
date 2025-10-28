class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.monthlyBudget = parseFloat(localStorage.getItem('monthlyBudget')) || 0;
        this.totalIncome = parseFloat(localStorage.getItem('totalIncome')) || 0;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.updateUI();
        document.getElementById('date').valueAsDate = new Date();
    }

    setupEventListeners() {
        document.getElementById('expenseForm').addEventListener('submit', (e) => {
            e.preventDefault(); this.addTransaction();
        });
        document.getElementById('setBudgetBtn').addEventListener('click', () => this.openModal('budgetModal'));
        document.getElementById('setIncomeBtn').addEventListener('click', () => this.openModal('incomeModal'));
        document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());
        document.getElementById('closeBudgetModal').addEventListener('click', () => this.closeModal('budgetModal'));
        document.getElementById('closeIncomeModal').addEventListener('click', () => this.closeModal('incomeModal'));
        document.getElementById('closeAlert').addEventListener('click', () => this.closeAlert());
        document.getElementById('closeExpenseAlert').addEventListener('click', () => this.closeExpenseAlert());
        document.getElementById('saveBudget').addEventListener('click', () => this.setBudget());
        document.getElementById('saveIncome').addEventListener('click', () => this.setIncome());
        document.getElementById('filterCategory').addEventListener('change', () => this.updateTransactionsList());
    }

    addTransaction() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        const type = document.querySelector('input[name="type"]:checked').value;

        if (!description || !amount || !category) return;

        if (type === 'expense') {
            if (this.monthlyBudget > 0 && amount > this.monthlyBudget) {
                this.showExpenseAlert(`$${amount} exceeds your $${this.monthlyBudget} budget!`);
                return;
            }
            const available = this.calculateAvailableBalance();
            if (amount > available && !confirm(`Only $${available.toFixed(2)} available! Continue?`)) return;
        }

        this.transactions.unshift({id: Date.now(), description, amount, category, date, type});
        this.saveToLocalStorage();
        this.updateUI();
        document.getElementById('expenseForm').reset();
        document.getElementById('date').valueAsDate = new Date();
    }

    showExpenseAlert(message) {
        document.getElementById('expenseAlertMessage').textContent = message;
        document.getElementById('expenseAlertModal').style.display = 'block';
    }

    closeExpenseAlert() {
        document.getElementById('expenseAlertModal').style.display = 'none';
    }

    deleteTransaction(id) {
        if (confirm('Delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveToLocalStorage();
            this.updateUI();
        }
    }

    resetData() {
        if (confirm('Reset all data? This cannot be undone!')) {
            this.transactions = [];
            this.monthlyBudget = 0;
            this.totalIncome = 0;
            localStorage.removeItem('transactions');
            localStorage.removeItem('monthlyBudget');
            localStorage.removeItem('totalIncome');
            this.updateUI();
        }
    }

    setBudget() {
        const amount = parseFloat(document.getElementById('budgetAmount').value);
        if (amount > 0) {
            this.monthlyBudget = amount;
            localStorage.setItem('monthlyBudget', amount);
            this.closeModal('budgetModal');
            this.updateUI();
        }
    }

    setIncome() {
        const amount = parseFloat(document.getElementById('incomeAmount').value);
        if (amount > 0) {
            this.totalIncome = amount;
            localStorage.setItem('totalIncome', amount);
            this.closeModal('incomeModal');
            this.updateUI();
        }
    }

    calculateTotals() {
        const additionalIncome = this.transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
        const totalIncome = this.totalIncome + additionalIncome;
        const expenses = this.transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
        const balance = totalIncome - expenses;
        const budgetLeft = this.monthlyBudget - expenses;
        return { totalIncome, expenses, balance, budgetLeft };
    }

    calculateAvailableBalance() {
        return this.calculateTotals().balance;
    }

    updateUI() {
        const { totalIncome, expenses, balance, budgetLeft } = this.calculateTotals();
        
        document.getElementById('totalBalance').textContent = `$${balance.toFixed(2)}`;
        document.getElementById('totalIncome').textContent = `$${totalIncome.toFixed(2)}`;
        document.getElementById('totalExpenses').textContent = `$${expenses.toFixed(2)}`;
        document.getElementById('monthlyBudget').textContent = this.monthlyBudget.toFixed(2);
        document.getElementById('budgetLeft').textContent = Math.max(0, budgetLeft).toFixed(2);
        document.getElementById('budgetUsed').textContent = expenses.toFixed(2);

        const budgetUsage = this.monthlyBudget > 0 ? (expenses / this.monthlyBudget) * 100 : 0;
        document.getElementById('budgetProgress').style.width = `${Math.min(budgetUsage, 100)}%`;
        document.getElementById('budgetPercent').textContent = `${Math.round(budgetUsage)}%`;

        if (budgetUsage >= 80 && budgetUsage < 100) {
            this.showBudgetAlert(`You've used ${Math.round(budgetUsage)}% of your budget!`);
        } else if (expenses > this.monthlyBudget) {
            this.showBudgetAlert(`Budget exceeded by $${(expenses - this.monthlyBudget).toFixed(2)}!`);
        }

        this.updateTransactionsList();
    }

    showBudgetAlert(message) {
        document.getElementById('alertMessage').textContent = message;
        document.getElementById('budgetAlertModal').style.display = 'block';
        setTimeout(() => this.closeAlert(), 5000);
    }

    closeAlert() {
        document.getElementById('budgetAlertModal').style.display = 'none';
    }

    updateTransactionsList() {
        const list = document.getElementById('transactionsList');
        const filter = document.getElementById('filterCategory').value;
        let filtered = filter === 'all' ? this.transactions : this.transactions.filter(t => t.category === filter);
        
        if (filtered.length === 0) {
            list.innerHTML = `<div class="empty-state"><i class="fas fa-receipt"></i><p>No transactions</p></div>`;
            return;
        }

        list.innerHTML = filtered.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-icon ${t.category}"><i class="fas fa-${this.getCategoryIcon(t.category)}"></i></div>
                    <div>${t.description}<br><small>${new Date(t.date).toLocaleDateString()}</small></div>
                </div>
                <div class="transaction-amount ${t.type === 'expense' ? 'transaction-expense' : 'transaction-income'}">
                    ${t.type === 'expense' ? '-' : '+'}$${t.amount.toFixed(2)}
                </div>
                <button class="delete-btn" onclick="expenseTracker.deleteTransaction(${t.id})"><i class="fas fa-trash"></i></button>
            </div>
        `).join('');
    }

    getCategoryIcon(category) {
        const icons = { food: 'utensils', transport: 'car', shopping: 'shopping-bag', bills: 'file-invoice', entertainment: 'film' };
        return icons[category] || 'ellipsis-h';
    }

    openModal(modalId) {
        document.getElementById(modalId).style.display = 'flex';
        if (modalId === 'budgetModal') document.getElementById('budgetAmount').value = this.monthlyBudget || '';
        if (modalId === 'incomeModal') document.getElementById('incomeAmount').value = this.totalIncome || '';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    saveToLocalStorage() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.expenseTracker = new ExpenseTracker();
});
