const $ = () => {
	console.log("muserve framework");
}

$._setup = function (element) {
	// attach element's prototype object's properties to element as function
	// NOTE: each property is name -> `$${name}`
	let prototype = Object.getPrototypeOf(element);
	while (prototype) {
		Object.getOwnPropertyNames(prototype).forEach((key) => {
			const property = `$${key}`;
			if (!element.hasOwnProperty(property)) {
				element[property] = function (data) {
					this[key] = data;
					return this;
				}
			}
		});

		// move up the prototype chain
		prototype = Object.getPrototypeOf(prototype);
	}

	// give element the $addChildren function if it has appendChild property
	if ("appendChild" in element) {
		element["$addChildren"] = function (children) {
			if (typeof children === typeof []) {
				children.forEach((child) => {
					element.appendChild(child);
				});
			} else {
				element.appendChild(children);
			}
			return this;
		}
	}

	// give element $style function
	element.$style = function (data) {
		this.style.cssText = data;
		return this;
	}

	// give element $on function which attaches an event listener to it
	element.$on = function (eventType, callback) {
		this.addEventListener(eventType, callback);
		return this;
	}

	element.$delegate = function (eventType, selector, callback) {
		this.addEventListener(eventType, (event) => {
			// get element that triggered the event
			const target = event.target;
			// check if target matches selector
			// closest looks up DOM tree for closest ancestor
			const matching = target.closest(selector);
			// if a matching element is found, it is a child of the
			// element the listener is on, then call the callback
			if (matching && this.contains(matching)) {
				callback.call(matching, event);
			}
		});
		return this;
	}

	element.$addClass = function (className) {
		element.classList.add(className);
		return this;
	}

	element.$removeClass = function (className) {
		element.classList.remove(className);
		return this;
	}

	element.$toggleClass = function (className) {
		if (!className) throw new Error("[framework] $toggleClass(): className must be defined");
		if (element.classList.contains(className)) {
			element.classList.remove(className);
		} else {
			element.classList.add(className);
		}
		return this;
	}

	return element;
}

$.$byId = function (id) {
	return this._setup(document.getElementById(id));
}

$.$byName = function (name) {
	return document.getElementsByName(name).values().map(
		(element) => this._setup(element)
	).toArray();
}

$.$byTag = function (tag) {
	return document.getElementsByTagName(tag).values().map(
		(element) => this._setup(element)
	).toArray();
}

$.$byClass = function (tag) {
	return document.getElementsByClassName(tag).values().map(
		(element) => this._setup(element)
	).toArray();
}

$.$select = function (selector) {
	return this._setup(document.querySelector(selector));
}

$.$selectAll = function (selector) {
	return document.querySelectorAll(selector).values().map(
		(element) => this._setup(element)
	).toArray();
}

$._root = "uninitialized";

$.$registerRoot = function (element) {
	if (element instanceof HTMLElement) {
		this._root = element;
	} else {
		throw new Error("[framework] $registerRoot(): root container can only be registered to an HTMLElement");
	}
}

$.$create = function (elementType, props = {}, attachToElement = this._root) {
	if (this._root === "uninitialized") {
		throw new Error("[framework] $create(): you need to register the root container first");
	}

	const newElement = document.createElement(elementType);

	if (attachToElement) attachToElement.appendChild(newElement);

	if (props.id) newElement.id = props.id;
	if (props.className) newElement.className = props.className;
	if (props.children) $._setup(newElement).$addChildren(children);
	if (props.onClick) $._setup(newElement).$on("click", props.onClick);

	return this._setup(newElement);
}

$.$createState = function (initialState) {
	const bindings = new Map();

	const handler = {
		set(target, key, value) {
			// check if value is different
			if (target[key] !== value) {
				target[key] = value;

				// trigger DOM update for any bound elements
				if (bindings.has(key)) {
					bindings.get(key).forEach((binding) => {
						binding.update(value);
					});
				}
			}
			return true;
		}
	};

	const proxy = new Proxy(initialState, handler);

	proxy.$bind = function (key, element, updateFunction) {
		if (!bindings.has(key)) {
			bindings.set(key, []);
		}
		bindings.get(key).push({ element, update: updateFunction });
		updateFunction(proxy[key]); // initial update
	}

	return proxy;
}

export default $;
