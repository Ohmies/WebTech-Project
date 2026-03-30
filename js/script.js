// จัดการ To-Do List: เพิ่ม/ลบ/ทำเสร็จ/กรอง และบันทึกข้อมูลไว้ใน localStorage
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("todo-form");
  const input = document.getElementById("todo-input");
  const list = document.getElementById("todo-list");
  const status = document.getElementById("todo-status");
  const clearCompletedBtn = document.getElementById("clear-completed");
  const filterButtons = document.querySelectorAll(".filter-btn");

  // ออกจากสคริปต์ทันทีหากไม่ได้อยู่หน้า project
  if (
    !form ||
    !input ||
    !list ||
    !status ||
    !clearCompletedBtn ||
    filterButtons.length === 0
  ) {
    return;
  }

  const STORAGE_KEY = "portfolio_todos";
  let todos = loadTodos();
  let currentFilter = "all";

  render();

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) {
      return;
    }

    todos.push({
      id: createTodoId(),
      text,
      completed: false,
    });

    input.value = "";
    saveTodos();
    render();
  });

  list.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const item = target.closest("li");
    if (!(item instanceof HTMLElement)) {
      return;
    }

    const { id } = item.dataset;
    if (!id) {
      return;
    }

    if (target.matches("button[data-action='delete']")) {
      todos = todos.filter((todo) => todo.id !== id);
      saveTodos();
      render();
      return;
    }

    if (target.matches("input[type='checkbox']")) {
      todos = todos.map((todo) => {
        if (todo.id === id) {
          return { ...todo, completed: !todo.completed };
        }

        return todo;
      });
      saveTodos();
      render();
    }
  });

  clearCompletedBtn.addEventListener("click", () => {
    todos = todos.filter((todo) => !todo.completed);
    saveTodos();
    render();
  });

  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const filter = button.dataset.filter;
      if (!filter) {
        return;
      }

      currentFilter = filter;
      render();
    });
  });

  function loadTodos() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed
        .filter(
          (todo) =>
            typeof todo?.id === "string" && typeof todo?.text === "string",
        )
        .map((todo) => ({
          id: todo.id,
          text: todo.text,
          completed: Boolean(todo.completed),
        }));
    } catch {
      return [];
    }
  }

  function saveTodos() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }

  function getFilteredTodos() {
    if (currentFilter === "active") {
      return todos.filter((todo) => !todo.completed);
    }

    if (currentFilter === "completed") {
      return todos.filter((todo) => todo.completed);
    }

    return todos;
  }

  function render() {
    const visibleTodos = getFilteredTodos();
    const completedCount = todos.filter((todo) => todo.completed).length;
    const activeCount = todos.length - completedCount;

    filterButtons.forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.filter === currentFilter,
      );
    });

    clearCompletedBtn.disabled = completedCount === 0;

    if (todos.length === 0) {
      status.textContent = "ยังไม่มีงาน";
    } else {
      status.textContent = `งานทั้งหมด ${todos.length} รายการ | ค้างอยู่ ${activeCount} | เสร็จแล้ว ${completedCount}`;
    }

    if (visibleTodos.length === 0) {
      list.innerHTML = "";
      if (todos.length > 0) {
        status.textContent += " | ไม่มีรายการในตัวกรองนี้";
      }
      return;
    }

    const html = visibleTodos
      .map((todo) => {
        const checked = todo.completed ? "checked" : "";
        const doneClass = todo.completed ? " is-done" : "";
        return `
					<li class="todo-item${doneClass}" data-id="${escapeHtml(todo.id)}">
						<label>
							<input type="checkbox" ${checked}>
							<span>${escapeHtml(todo.text)}</span>
						</label>
						<button type="button" data-action="delete" aria-label="ลบงาน ${escapeHtml(todo.text)}">ลบ</button>
					</li>
				`;
      })
      .join("");

    list.innerHTML = html;
  }

  function escapeHtml(value) {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function createTodoId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `todo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
});
