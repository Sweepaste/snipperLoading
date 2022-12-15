
// three status, default status is:'incomplete',when click 'edit' button in the first time,
//status become 'editing': and the <span> tag become <input> tag, when click 'edit' again
//status become 'incomplete' and renew the value, when click the <span> tag status become
//'completed',when click remove, the item is deleted.
const APIs = (() => {
    const URL = "http://localhost:3000/todos";

    const addTodo = (newTodo) => {
        // post
        return fetch(URL, {
            method: "POST",
            body: JSON.stringify(newTodo),
            headers: { "Content-Type": "application/json" },
        }).then((res) => res.json());
    };
    
    const removeTodo = (id) => {
        return fetch(URL + `/${id}`, {
            method: "DELETE",
        }).then((res) => res.json());
    };
    // Add editTodo(), update with content and status.
    const editTodo = (id, content,s) => {
        return fetch(URL + `/${id}`, {
            method: "PATCH",
            body: JSON.stringify({
                title: content,
                status:s,
            }),
            headers: { "Content-Type": "application/json" },
        }).then((res) => res.json());
    };

    const getTodos = () => {
        return fetch(URL).then((res) => res.json());
    };
    return {
        addTodo,
        removeTodo,
        getTodos,
        editTodo,
    };
})();

const Model = (() => {
    //todolist
    class State {
        #todos; //[{id: ,title: },{}]
        #onChange;
        #signal;
        constructor() {
            this.#todos = [];
            this.#signal = 0;
        }

        get todos() {
            return this.#todos;
        }
        // Once the model is updated, call onchange()->viewUpdateTodo()
        set todos(newTodo) {
            
            this.#todos = newTodo;
            this.#onChange?.();  //Optional chaining
        }
        set signal(sign) {
            this.#signal = sign;
            this.#onChange?.();
        }

        get signal() {
            return this.#signal;
        }
        subscribe(callback) {
            this.#onChange = callback;
        }
    }
    let { getTodos, removeTodo, addTodo,editTodo } = APIs;

    return {
        State,
        getTodos,
        removeTodo,
        addTodo,
        editTodo,
    };
})();


const View = (() => {
    const formEl = document.querySelector(".form"); 
    //const todoListEl = document.querySelector(".todo-list");
    const todoListEl = document.createElement("ul");
    todoListEl.className = "todo-list";
    const todoDiv = document.querySelector(".show");
    const updateTodoList = (todos,signal) => {
        let todoTemplate = "", completedTemplate = "",template="";
        
        if (signal === 1) {
            // let element = document.createElement("h1");
            // element.textContent = "Loading....";
            // todoDiv.appendChild(element);
            todoDiv.innerHTML=`<h1>Loading..</h1>`
        }
        else {
            todoDiv.innerHTML = ``;
            todoDiv.appendChild(todoListEl);
            todos.forEach((todo) => {
                let temp;
            
                if (todo.status === 'incomplete') {
                    temp = `<li><span id="${todo.id}">${todo.title}</span>
                <button class="btn--edit" id="${todo.id}">edit</button>
                <button class="btn--delete" id="${todo.id}">remove</button></li>`;
                    todoTemplate += temp;
                }
                else if (todo.status === 'editing') {
                    temp = `<li><input value="${todo.title}"/>
                <button class="btn--edit" id="${todo.id}">edit</button>
                <button class="btn--delete" id="${todo.id}">remove</button></li>`;
                    todoTemplate += temp;
                }
                else if (todo.status == 'completed') {
                    temp = `<li><span id="${todo.id}" style="text-decoration:line-through">${todo.title}</span>
                <button class="btn--delete" id="${todo.id}">remove</button></li>`;
                    completedTemplate += temp;
                }
            
            });
            template = todoTemplate + `<li style="border: none ;background-color:white"></li>` + `<li style="border: none ;background-color:white"></li>` + completedTemplate;
        
            if (todos.length === 0) {
                template = "no task to display"
            }
            todoListEl.innerHTML = template;
        }
        
    };

    return {
        formEl,
        todoListEl,
        updateTodoList,
    };
})();

//reference: pointer
//window.console.log

//

/* 
    prevent the refresh
    get the value from input
    save the new task to the database(could fail)
    save new task object to state, update the page
    

*/
//connector between model and view
const ViewModel = ((View, Model) => {
    // build new model object
    const state = new Model.State();

    const getTodos = () => {
        state.signal = 1;
        // setTimeout(() => {
        //     Model.getTodos().then((res) => {
        //         state.todos = res;
        //     }).finally(() => state.signal = 0);
        // }, 1000);
        Model.getTodos().then((res) => {
            state.todos = res;
        }).finally(() => state.signal = 0);
    };

    const addTodo = () => {
        View.formEl.addEventListener("submit", (event) => {
            event.preventDefault();
            
            const title = event.target[0].value;
            if(title.trim() === "") {
                alert("please input title!");
                return;
            }
            //todo in model {title(content),status,id}
            const newTodo = { title, status: "incomplete" };
            state.signal = 1;
            
            Model.addTodo(newTodo)
            .then((res) => {
                state.todos = [res, ...state.todos].reverse();
                event.target[0].value = ""
            })
            .catch((err) => {
                alert(`add new task failed: ${err}`);
            })
            .finally(() => {
                state.signal = 0;
            });
            
            
        });
    };

    const removeTodo = () => {
        //event bubbling: event listener from parent element can receive event emitted from its child
        View.todoListEl.addEventListener("click",(event)=>{
            //console.log(event.target/* emit the event */, event.currentTarget/* receive the event */);
            const id = event.target.id;
            if (event.target.className === "btn--delete") {
                state.signal = 1;
                Model.removeTodo(id).then(res => {
                    state.todos = state.todos.filter(todo => +todo.id !== +id)
                }).catch(err => alert(`delete todo failed: ${err}`)).finally(() => state.signal = 0)
            }
        })
    };

    const EditTodo = () => {
        View.todoListEl.addEventListener("click",(event)=>{
            const id = event.target.id;
            
            //Three situation: editing->incomplete,incomplete->editing,incomplete->completed
            if (event.target.className === "btn--edit" && event.target.previousElementSibling.nodeName === 'INPUT') {
                let content = event.target.previousElementSibling.value;
                if(content.trim() === "") {
                    alert("please input title!");
                    return;
                }
                Model.editTodo(id, content,"incomplete").then(res => {
                    state.todos = state.todos.map((todo) => {
                        state.signal = 1;
                        //todo.id->int id->string
                        if (+todo.id === +id) {     
                            todo.title = content;
                            todo.status = "incomplete";
                        }
                        return todo;
                    })
                }).catch(err=>alert(`edit todo failed: ${err}`)).finally(() => state.signal = 0)
                
            }
            if (event.target.className === "btn--edit" && event.target.previousElementSibling.nodeName === 'SPAN') {
              
                let content = event.target.previousElementSibling.textContent;
                state.signal = 1;
                Model.editTodo(id, content,"editing").then(res => {
                    state.todos = state.todos.map((todo) => {
                        if (+todo.id === +id) {
                            todo.status = "editing";
                        }
                        return todo;
                    })
                }).catch(err=>alert(`edit todo failed: ${err}`)).finally(() => state.signal = 0)
            }
            if (event.target.nodeName === 'SPAN') {
                let content = event.target.textContent;
                state.signal = 1;
                Model.editTodo(id, content, "completed").then(res => {
                    state.todos = state.todos.map((todo) => {
                        if (+todo.id === +id) {
                            todo.status = "completed";
                        }
                        return todo;
                    })
                }).catch(err=>alert(`edit todo failed: ${err}`)).finally(() => state.signal = 0)
            }
        })
    }
    const bootstrap = () => {
        state.subscribe(() => {
            View.updateTodoList(state.todos,state.signal);
        });
        addTodo();
        getTodos();
        removeTodo();
        EditTodo();
        
    };

    return {
        bootstrap,
    };
})(View, Model);

ViewModel.bootstrap();
