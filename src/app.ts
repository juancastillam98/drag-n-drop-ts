//Drag and drop interface--> will implement everything that's going to be dragged
interface Dragable{
    dragStartHandler(event: DragEvent): void;
    dragEndHandler(event: DragEvent): void;
}
interface DragTarget{//placed where elements are dropped (projectList class
    dragOverHandler(event: DragEvent): void;//to handler if you drag something permited
    dropHandler(event: DragEvent): void;//handler the drop
    dragLeaveHandler(event: DragEvent): void; //to give visual feedback whe you drag something
}

//Project type
enum ProjectStatus { Active, FInished}
class Project{
    constructor(
        public id: string,
        public title: string,
        public description: string,
        public people: number,
        public status: ProjectStatus){

    }
}

//Project State Management -> we do this by creating a global static class
type Listener<T> =(items: T[])=>void;
class State<T>{
    protected listeners: Listener<T>[] = [];
    addListener(listenerFn: Listener<T>){
        this.listeners.push(listenerFn);//
    }
}
//it needs to be called when something changes
class ProjectState extends  State<Project>{
    private projects: Project[]=[];
    private static instance: ProjectState;
    private constructor(){
        super();
    }//SINGLETON design pattern
    static getInstance(){
        if (this.instance){
            return this.instance;
        }
        this.instance = new ProjectState();
        return this.instance;
    }

    addProject(title: string,  description: string, numOfPeople: number){
        const newProject= new Project(
            Math.random().toString().trim(),
            title,
            description,
            numOfPeople,
            ProjectStatus.Active
    )
        this.projects.push(newProject);
        this.updateListeners();
    }
    //this method is to switch the project (we'll use to move a project from a list to an another
    moveProject(projectId: string, newStatus: ProjectStatus){
        const project= this.projects.find(prj =>prj.id === projectId);
        if (project && project.status !== newStatus){
            project.status = newStatus;
        }
        this.updateListeners();
    }
    private updateListeners(){
        for (const listenersFn of this.listeners ) {
            listenersFn(this.projects.slice())//we make a copy of every listener of the array
        }
    }
}
//const projectState =  new ProjectState(); //normal instance
const projectState = ProjectState.getInstance();//Singleton instance


//Validationf
interface Validatable{
    value: string | number;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
}
function validate(validatableInput: Validatable){
    let isValid = true;
    if (validatableInput.required) {
        isValid = isValid && validatableInput.value.toString().trim().length !== 0;
    }
    if (validatableInput.minLength != null && typeof  validatableInput.value === 'string'){
        isValid = isValid && validatableInput.value.length > validatableInput.minLength;
    }
    if (validatableInput.maxLength != null && typeof  validatableInput.value === 'string'){
        isValid = isValid && validatableInput.value.length < validatableInput.maxLength;
    }
    if (validatableInput.min != null && typeof  validatableInput.value === 'number'){
        isValid = isValid && validatableInput.value > validatableInput.min;
    }
    if (validatableInput.max != null && typeof  validatableInput.value === 'number'){
        isValid = isValid && validatableInput.value < validatableInput.max;
    }
    return isValid;
}

//autobind decorator
function autobind(
    _: any, // first param (called target) apply to class
    _2: string, //second param (called method) apply to the name of the method which this decorator will be applied to
    descriptor: PropertyDescriptor //3rd param (called descriptor) is an object which describe the class
){
    const originalMethod = descriptor.value;
    const adjDescriptor: PropertyDescriptor = {
        configurable: true,
        get(){
            const bondFn = originalMethod.bind(this);
            return bondFn;
        }
    };
    return adjDescriptor;
}

//base class -> it'll be generic because some attributes may not be the same in different classes
abstract class Component <T extends HTMLElement, U extends  HTMLElement>{
    templateElement: HTMLTemplateElement;
    hostElement: T;
    element: U;

    constructor(
        templateId: string,
        hostElementId: string,
        insertAtStart?: boolean,
        newElementId?: string,
    ){
        this.templateElement =<HTMLTemplateElement> document.getElementById(templateId)!;
        this.hostElement = <T>document.getElementById(hostElementId)!;

        //Will render inmediately this in the <div id="app"></div>. It's is to show content of the template with #id project-input in #app
        const inportedNode = document.importNode(this.templateElement.content, true);
        this.element = <U>inportedNode.firstElementChild;//The section with class project
        if (newElementId){
            this.element.id = newElementId;//Added to the fom an id
        }
        this.attach(insertAtStart || false);
    }

    private attach(insertAtBeginning: boolean){//attach is to add the code (the constructor) into the dom
        this.hostElement.insertAdjacentElement( insertAtBeginning ? "afterbegin" : "beforeend", this.element);
    }

    abstract configure(): void;
    abstract renderContent(): void;
}
//ProjectItem Class --> responsible of render any single item
class ProjectItem extends Component<HTMLUListElement, HTMLLIElement> implements Dragable{
    //private project: Project;

    constructor(hostId: string, private project: Project) {
        super("single-project", hostId, false, project.id); //template, hostname, insertstart, newElement
        this.project = project;
        this.configure();
        this.renderContent();
    }

    @autobind
    dragStartHandler(event: DragEvent){
        //.dataTransfer is a mehtod of js
        event.dataTransfer!.setData("text/plain", this.project.id)
        event.dataTransfer!.effectAllowed = "move";
    }
    dragEndHandler(_: DragEvent){
        console.log("DragEnd")
    }

    get persons(){
        if (this.project.people === 1){
            return "1 person";
        }else{
            return `${this.project.people} people`
        }
    }

    configure(){
        this.element.addEventListener("dragstart", this.dragStartHandler);
        this.element.addEventListener("dragend", this.dragEndHandler);
    }
    renderContent(){
        //Int he abstract class,   thi.element: U; is the second param (HTMLLIElement)
        this.element.querySelector("h2")!.textContent = this.project.title;
        this.element.querySelector("h3")!.textContent = this.persons + " assigned";
        this.element.querySelector("p")!.textContent = this.project.description;
    }
}

//Project list -> the idea is to list the template (project-list) all the projects
class ProjectList extends Component<HTMLDivElement, HTMLElement> implements DragTarget{
    assignedProjects: Project[];

    //private type: "active" | "finished";
    constructor(private type:  "active" | "finished"){
        super("project-list", "app", false, `${type}-projects`);
        this.assignedProjects = [];
        this.configure();
        this.renderContent();
     }

     @autobind
    dragOverHandler(event: DragEvent): void {
        if (event.dataTransfer && event.dataTransfer.types[0]==="text/plain"){//with this we allow only .txt of plai will be allow. no img
            event.preventDefault();
            const listEl = this.element.querySelector("ul")!
            listEl.classList.add("droppable")
        }

    }
    @autobind
    dropHandler(event: DragEvent): void {
        const prjId = event.dataTransfer!.getData("text/plain");
        projectState.moveProject(prjId, this.type==="active" ? ProjectStatus.Active : ProjectStatus.FInished);
    }
    @autobind
    dragLeaveHandler(_: DragEvent): void {
        const listEl = this.element.querySelector("ul")!
        listEl.classList.remove("droppable")
    }

    configure(){

        this.element.addEventListener("dragover", this.dragOverHandler)
        this.element.addEventListener("dragleave", this.dragLeaveHandler)
        this.element.addEventListener("drop", this.dropHandler)

        //addListner needs a function (an arrow function
        projectState.addListener((projects: Project[])=>{//in this case a list of projects
            //befeore get inserted into the project, will be filter them
            const relevantProject = projects.filter(prj=>{
                if (this.type==="active"){
                    return prj.status === ProjectStatus.Active
                }
                return prj.status === ProjectStatus.FInished  //if return false, we drop the element
            })
            this.assignedProjects = relevantProject;
            this.renderProjects();
        });
    }
    //adding an id into the <ul>
    renderContent(){
        const listId = `${this.type}-projects-list`;
        this.element.querySelector("ul")!.id = listId;//remenred, element is the section (I don't know why he didn't name)
        this.element.querySelector("h2")!.textContent = this.type.toUpperCase()+" PROJECTS";
    }

    //create a list of projects and display them in <ull>
    private renderProjects(){
        const listEl = <HTMLUListElement>document.getElementById(`${this.type}-projects-list`)!;
        listEl.innerHTML="";
        for (const prjItem of this.assignedProjects){
            new ProjectItem(this.element.querySelector("ul")!.id, prjItem)
        }
    }

}
//Project class
class ProjectInput extends Component<HTMLDivElement, HTMLFormElement>{

    titleInputElement: HTMLInputElement;
    descriptionInputElement: HTMLInputElement;
    peopleInputElement: HTMLInputElement;
    constructor(){
        super("project-input", "app", true, "user-input")
        this.titleInputElement=this.element.querySelector("#title") as HTMLInputElement;
        this.descriptionInputElement=this.element.querySelector("#description") as HTMLInputElement;
        this.peopleInputElement=this.element.querySelector("#people") as HTMLInputElement;
        //If we don't use .bind() when we point with "this" it won't show anything.
        this.configure();
        this.renderContent()
    }
    configure(){
        this.element.addEventListener("submit", this.submitHandler);
    }
    renderContent(){
    }

    private gatherUserInput(): [string,  string,  number] | void{//a tuple
        const enteredTitle = this.titleInputElement.value;
        const enteredDescription = this.descriptionInputElement.value;
        const enteredPeople = this.peopleInputElement.value;

        const titleValidatable: Validatable={
            value: enteredTitle,
            required: true
        }
        const descriptionInputElement: Validatable={
            value: enteredDescription,
            required: true,
            minLength: 5
        }
        const peopleInputElement: Validatable={
            value: +enteredPeople,
            required: true,
            min: 1,
            max: 5
        }

        if (!validate(titleValidatable) ||
            !validate(descriptionInputElement) ||
            !validate(peopleInputElement)
        ) {
            alert("invalid input");
            return;

        }else{
            return [enteredTitle, enteredDescription, Number(enteredPeople)]
        }
    }
    private clearInputs(){
        this.titleInputElement.value = "";
        this.descriptionInputElement.value = "";
        this.peopleInputElement.value = "";
    }
    @autobind
    private submitHandler(event: Event) {
        event.preventDefault();
        //console.log(this.titleInputElement.value);
        const userInput = this.gatherUserInput();
        if (Array.isArray(userInput)){
            const [title, desc, people]=userInput;
            projectState.addProject(title, desc, people);
            console.log(title, desc, people)
            this.clearInputs();
        }
    }

}
//once we render the class, it will show the properity
const projectInput = new ProjectInput();
const activeProjectList=new ProjectList("active")
const finishedProjectList=new ProjectList("finished")
