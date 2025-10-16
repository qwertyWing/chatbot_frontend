import { BrowserRouter, Routes, Route } from "react-router-dom"
import LoginPage from "./login_page/login_main.js";
import ChattingApp from "./chatting_page/chatting_main.js";

function App(){
    return(
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<LoginPage />}/>
                <Route path="/chatting" element={<ChattingApp />}/>
            </Routes>
        </BrowserRouter>
    );
}

export default App;