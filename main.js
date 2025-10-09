/* Modal + form logic wired to Google Apps Script Web App — fixed success UI */
(function () {
	const modal = document.querySelector("[data-modal]");
	const dialog = modal?.querySelector("[data-modal-dialog]");
	const openers = document.querySelectorAll("[data-modal-open]");
	const closers = modal?.querySelectorAll("[data-modal-close]") || [];
	const form = modal?.querySelector("#lead-form");
	const success = modal?.querySelector(".modal__success");
	const sink = document.querySelector('iframe[name="gsheet_sink"]'); // приёмник ответа
	const submitBtn = form?.querySelector('[type="submit"]');
	const deployField = form?.querySelector('input[name="deploymentId"]');
	const note = form?.querySelector(".form__note");

	// Вместо "первой загрузки" используем «ждём ответа»
	let awaitingResponse = false;
	let watchdog = null; // таймер на случай, если ответ не пришел
	let lastFocused = null;

	const FOCUSABLE = [
		"a[href]",
		"button:not([disabled])",
		"input:not([disabled])",
		"select:not([disabled])",
		"textarea:not([disabled])",
		'[tabindex]:not([tabindex="-1"])',
	];

	// ---------- Шапка/меню (как было) ----------
	const navToggle = document.querySelector("[data-header-toggle]");
	const navMenu = document.querySelector("[data-header-menu]");
	const yearEl = document.getElementById("y");
	if (yearEl) yearEl.textContent = new Date().getFullYear();

	if (navToggle && navMenu) {
		const desktopQuery = window.matchMedia("(min-width: 901px)");
		const menuItems = navMenu.querySelectorAll("a, button");
		let outsideClickTimer = null;

		document.body.classList.add("js-nav-ready");

		function handleMenuKeydown(event) {
			if (event.key === "Escape") updateMenu(false, { focusToggle: true });
		}

		function handleOutsideClick(event) {
			if (
				!navMenu.contains(event.target) &&
				!navToggle.contains(event.target)
			) {
				updateMenu(false);
			}
		}

		function updateMenu(open, options = {}) {
			const { focusToggle = false } = options;
			navToggle.setAttribute("aria-expanded", String(open));
			navToggle.setAttribute(
				"aria-label",
				open ? "Закрыть меню" : "Открыть меню"
			);
			navMenu.classList.toggle("is-open", open);
			const shouldHide = !open && !desktopQuery.matches;
			navMenu.setAttribute("aria-hidden", shouldHide ? "true" : "false");
			document.body.classList.toggle("is-menu-open", open);

			if (open) {
				document.addEventListener("keydown", handleMenuKeydown);
				outsideClickTimer = window.setTimeout(() => {
					document.addEventListener("click", handleOutsideClick);
					outsideClickTimer = null;
				});
			} else {
				document.removeEventListener("keydown", handleMenuKeydown);
				if (outsideClickTimer) {
					window.clearTimeout(outsideClickTimer);
					outsideClickTimer = null;
				}
				document.removeEventListener("click", handleOutsideClick);
				if (focusToggle) navToggle.focus({ preventScroll: true });
			}
		}

		const handleQueryChange = (event) => {
			if (event.matches) {
				updateMenu(false);
				navMenu.classList.remove("is-open");
				navMenu.setAttribute("aria-hidden", "false");
				document.body.classList.remove("is-menu-open");
				if (outsideClickTimer) {
					window.clearTimeout(outsideClickTimer);
					outsideClickTimer = null;
				}
				document.removeEventListener("click", handleOutsideClick);
			} else if (navToggle.getAttribute("aria-expanded") === "true") {
				navMenu.setAttribute("aria-hidden", "false");
			} else {
				navMenu.setAttribute("aria-hidden", "true");
			}
		};

		navMenu.setAttribute(
			"aria-hidden",
			desktopQuery.matches ? "false" : "true"
		);
		navToggle.addEventListener("click", () => {
			const isOpen = navToggle.getAttribute("aria-expanded") === "true";
			updateMenu(!isOpen);
		});
		menuItems.forEach((item) => {
			item.addEventListener("click", () => {
				if (!desktopQuery.matches) updateMenu(false);
			});
		});
		if (desktopQuery.addEventListener) {
			desktopQuery.addEventListener("change", handleQueryChange);
		} else if (desktopQuery.addListener) {
			desktopQuery.addListener(handleQueryChange);
		}
		handleQueryChange(desktopQuery);
	}

	function trapFocus(e) {
		if (!modal || !modal.classList.contains("is-open")) return;
		const focusables = dialog.querySelectorAll(FOCUSABLE.join(","));
		if (!focusables.length) return;
		const first = focusables[0];
		const last = focusables[focusables.length - 1];

		if (e.key === "Tab") {
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		} else if (e.key === "Escape") {
			closeModal();
		}
	}

	function openModal() {
		if (!modal) return;
		lastFocused = document.activeElement;
		modal.classList.add("is-open");
		document.body.classList.add("is-locked");
		modal.removeAttribute("aria-hidden");
		setTimeout(() => {
			const el = dialog.querySelector(FOCUSABLE.join(","));
			el?.focus();
		}, 0);
		document.addEventListener("keydown", trapFocus);
	}

	function closeModal() {
		if (!modal) return;
		modal.classList.remove("is-open");
		document.body.classList.remove("is-locked");
		modal.setAttribute("aria-hidden", "true");
		document.removeEventListener("keydown", trapFocus);
		success?.setAttribute("hidden", "");
		form?.removeAttribute("hidden");
		note && (note.textContent = "...");
		lastFocused?.focus();
	}

	openers.forEach((btn) =>
		btn.addEventListener("click", (e) => {
			e.preventDefault();
			openModal();
		})
	);
	[...closers].forEach((btn) =>
		btn.addEventListener("click", () => closeModal())
	);
	modal?.addEventListener("click", (e) => {
		if (e.target.classList.contains("modal__backdrop")) closeModal();
	});

	// ---------- Отправка формы в Google Sheets ----------
	if (form) {
		// Подставим action из конфига, если задан
		if (window.GSCRIPT?.WEBAPP_URL) {
			form.setAttribute("action", window.GSCRIPT.WEBAPP_URL);
		}
		// Прокинем deploymentId, если задан
		if (window.GSCRIPT?.DEPLOYMENT_ID && deployField) {
			deployField.value = window.GSCRIPT.DEPLOYMENT_ID;
		}

		form.addEventListener("submit", (e) => {
			// Проверим наличие action
			const action = form.getAttribute("action") || "";
			const bad =
				!action || /ВАШ_WEB_APP_URL|YOUR_WEB_APP_URL|ЗАМЕНИТЕ/i.test(action);
			if (bad) {
				e.preventDefault();
				alert(
					"Не задан URL веб‑приложения Google Apps Script. Укажите его в window.GSCRIPT.WEBAPP_URL или в атрибуте action."
				);
				return;
			}

			// Готовим UI «отправляется»
			form.setAttribute("aria-busy", "true");
			submitBtn?.setAttribute("disabled", "");
			note && (note.textContent = "Отправляем…");

			// Фикс: явно помечаем, что ждём загрузку iframe именно как результат сабмита
			awaitingResponse = true;

			// Сторожок на случай, если ответ не придёт (403/сетевые блоки и т.п.)
			clearTimeout(watchdog);
			watchdog = setTimeout(() => {
				form.removeAttribute("aria-busy");
				submitBtn?.removeAttribute("disabled");
				awaitingResponse = false;
				note &&
					(note.textContent =
						"Не удалось отправить форму (проверьте доступ Web App и URL /exec).");
				// здесь можно логировать/репортить
			}, 9000);

			// ВАЖНО: не делаем preventDefault — форма уходит в скрытый iframe по target="gsheet_sink"
		});

		if (sink) {
			// Обрабатываем загрузку любого документа в iframe,
			// но действуем только если действительно ждём ответа от текущей отправки
			sink.addEventListener("load", () => {
				if (!awaitingResponse) return; // игнорируем фоновые загрузки
				clearTimeout(watchdog);
				awaitingResponse = false;

				form.removeAttribute("aria-busy");
				submitBtn?.removeAttribute("disabled");
				try {
					form.reset();
				} catch (_) {}

				// Показываем успешный экран
				form.setAttribute("hidden", "");
				success?.removeAttribute("hidden");
				note && (note.textContent = "Готово!");

				// По желанию — авто‑закрытие
				// setTimeout(() => closeModal(), 2500);
			});

			// На некоторых браузерах «ошибку» тоже можно поймать
			sink.addEventListener("error", () => {
				clearTimeout(watchdog);
				awaitingResponse = false;
				form.removeAttribute("aria-busy");
				submitBtn?.removeAttribute("disabled");
				note &&
					(note.textContent =
						"Ошибка загрузки ответа. Проверьте деплой Web App.");
			});
		}
	}

	// Экспорт для отладки
	window.DemoModal = { open: openModal, close: closeModal };
	window.LeadModal = window.DemoModal;
})();
