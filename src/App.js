import './App.css';
import { encode, decode,decodeAsync } from "@msgpack/msgpack";
import Info from './info.js';
import ThreadView from "./ThreadView.js";
import ModeSel from './Mode.js';
import JogUI from './JogUI.js';
import Debug from './Debug.js';
import Feeding from './Feeding.js';
import React, { Component, useState, useEffect } from 'react';
import {useForm} from 'react-hook-form';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Dropdown from 'react-bootstrap/Dropdown';
import Button from 'react-bootstrap/Button';
import {Form, InputGroup,Col,Grid,Row} from 'react-bootstrap';
import FormControl from 'react-bootstrap/FormControl';
import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import Modal from 'react-bootstrap/Modal';
import useCookie from "./useCookie";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Spinner from 'react-bootstrap/Spinner';

import ListGroup from 'react-bootstrap/ListGroup';
import OverlayTrigger from "react-bootstrap/OverlayTrigger";
import Tooltip from "react-bootstrap/Tooltip";
import Rev from './Rev.js';
import Hobbing from './hobbing.js';


// TODO: refactor, why so many modes unused here?
//  original intent was to map modes to the YASM states in the firmware

const modes= {
 0: "Startup",
 1: "",
 2: "Slave Jogging",
 3: "",
 4: "",
 9: "Hob Ready",
 10: "Hob Running",
 11: "Hob Stop"
};


async function decodeFromBlob(blob: Blob): unknown {
  if (blob.stream) {
    return await decodeAsync(blob.stream());
  } else {
    return decode(await blob.arrayBuffer());
  }
}

const ModalError = ({showModalError, modalErrorMsg, setShowModalError}) => {
  return (
    <>

      <Modal show={showModalError} >
        <Modal.Header closeButton>
          <Modal.Title>ERROR!!!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalErrorMsg}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={ () => setShowModalError(false)} >
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
const RangeSlider = (props) => {

  const [rangeval, setRangeval] = useState(props.defaultValue);

  return (
    <div>
      <input type="range" className="custom-range" min=".5" max="5" 
       step="0.1"
       defaultValue={props.defaultValue}
       onChange={(event) => setRangeval(event.target.value)} />
      <span>{props.name}: {rangeval}</span>
      <span className="col-12">
        <input className="btn btn-primary" type="submit" value={`Update ${props.name}`} />
      </span>
    </div>
  );
};

var ws = "";
export default function App() {
  const { register, handleSubmit, watch, errors } = useForm();

  
  const onSubmitPitch = (data) => {
    var c = config
    c.pitch = data.pitch
    setConfig(c);
    console.log("data",data);
    sendConfig();
  }

  const onSubmitNvConfig = (data) => {
    console.log("submit nvdata",data);
    delete data.pitch;
    sendNvConfig(data);
  }

  const onSubmitJog = (data) => {
    var c = config
    c.f = feedingLeft;
    c.s = syncStart;
    if(submitButton == 1){
      c.jm = data.jog_mm;
      setConfig(c);
      jog();
    }else if(submitButton == -1){
      c.jm = Math.abs(data.jog_mm) * -1;
      setConfig(c);
      jog();
    }else if(submitButton == 3){
      // move Z- for thread offset
      // TODO: move this threading offset stuff to a new tab and make a component dedicated to threading
      /*
      setThreadOffset(config.pitch / passes());
      c.jm = (threadOffset * -1) ;
      setConfig(c);
      jog();
      */
      console.log("MOVED TO ThreadView!!!!  Z- btn");
      
    }else if(submitButton == 4){
      // TODO: move this too
      
    }
    console.log("onSubmitJog data",data,c,submitButton);
  }

  const onSubmitAbsJog = (data) => {
    // TODO: consider making this a component and also having it in "new jog"
    //
    console.log("jogAbs submit clicked",data)
    var c = config;
    c.f = feedingLeft;
    c.s = syncStart;
    
    jogAbs(data.jog_abs_mm);  
  }

  const handleResetNvConfig = (data) => {
    console.log("resetting config");
    var d = {cmd: "resetNvConfig"};
    ws.send(JSON.stringify(d));
  }

  const handleAddrChange = e => {
    setAddr(e.target.value);
    updateCookie(e.target.value,1000);
  }

  const handleEncClick = data => {
    console.log("debug click",data);
    var d = {cmd: "debug",dir: data};
    ws.send(JSON.stringify(d));
  }

  const onSubmitRapid = data => {
    var c = config
    c.f = feedingLeft;
    c.s = syncStart;
    c.rapid = data.rapid
    setConfig(c);
    console.log("range submit data",data);
    sendConfig();
  }
  const onSubmitJogScaler = data => {
    var c = config
    c.sc = data.sc
    setConfig(c);
    console.log("Jog Scaler submit data",data);
    sendConfig();
  }

  const handleModeSelect = data => {
    var c = config
    c.m = data;
    setConfig(c);
    console.log("select data",data);
    if(data == 5){
      setModalErrorMsg("Mode not implemented yet");
      setShowModalError(true);
    }
    sendConfig();
  }

  // TODO: read up on const function literals vs functions and pick one
  
  const handleView = (m) => {
    if(m != undefined){
      console.log("hanlde view: ",m);
      if(m == 2 || m == 3){
        setShowJog(true);
      }else{
        setShowJog(false);
      }
      if(m == 9 || m == 10 || m == 11){
        console.log("set hobbing enabled")
      }
    }
  }

  const handleJogTabSelect = data => {
    console.log("select tab",data);
    if(data == "jog_tab"){
      // What was this for?
    }else if(data == "config_tab"){
      console.log("config_tab selectyed");
      getNvConfig();
    }
  }
  const [cookie,updateCookie] = useCookie("url", "ws://192.168.1.93/els");
  const [addr,setAddr] = useState(cookie);
  const [config,setConfig] = useState({});
  const [connected,setConnected] = useState(false);
  const [showJog,setShowJog] = useState(false);
  const [showRapid,setShowRapid] = useState(false);
  const [timeout, setTimeout] = useState(250);
  const [dro,setDRO] = useState(0.0);
  const [rpm,setRPM] = useState(0);
  const [newstats,setNewstats] = useState(false);
  const [stats, setStats] = useState({});
  const [nvConfig,setNvConfig] = useState({error: true});
  const [origin,setOrigin] = useState();
  const [showModalError, setShowModalError] = useState(false);
  const [modalErrorMsg, setModalErrorMsg] = useState("not set");
  const [feedingLeft, setFeedingLeft] = useState(true);
  const [syncStart, setSyncStart] = useState(true);
  
  const [encSpeed, set_encSpeed] = useState(0);

  const me = {setModalErrorMsg: setModalErrorMsg,setShowModalError: setShowModalError};




  const [warnings, setWarnings] = useState([]);
  const [logs, setLogs] = useState([]);
  const [submitButton,setSubmitButton] = useState(1);
  const [threadOffset, setThreadOffset] = useState(0.0);


  // I believe this sets the network address in a cookie so it can be reused on page refresh
  useEffect(() => {
    if(!connected){
      console.log(addr,cookie);
      if(cookie != addr){
        
        setAddr(cookie);
      }
      connect();
    }
  },[connected]);

  function updateEncSpeed(val){
    set_encSpeed(val);
    var c = {};
    c.encSpeed = val;
    var d = {cmd: "updateEncSpeed",config: c}
    console.log("ws",d,ws);
    ws.send(JSON.stringify(d));
  }

  function connect_click(e){
    if(connected){
      disconnect();
      connect();
    }else{
      connect();
    }
    console.log("doink");
  }
  function disconnect(){
    console.log("WS: ",ws);
    if(ws !== null && ws != "" && ws.readyState === 1){
      ws.close();
    }
    setConnected(false);
  }

  function fetch(){
    var d = {cmd: "fetch"};
    if(ws.readyState === 1){
      ws.send(JSON.stringify(d));
    }else{
      setTimeout(fetch,500);
    }
    
  }

  function getNvConfig(){
    var d = {cmd: "getNvConfig"};
    ws.send(JSON.stringify(d));
  }
  function sendNvConfig(data){
    data["cmd"] = "setNvConfig";
    ws.send(JSON.stringify(data));
  }

  function jogcancel(){
    var d = {cmd: "jogcancel"};
    ws.send(JSON.stringify(d));
  }

  function sendConfig(){
    var d = {cmd: "sendConfig",config: config}
    console.log("ws",config,ws);
    if(typeof ws.send !== "undefined"){
      console.log("sending");
      ws.send(JSON.stringify(d));
    }else{
      // TODO: WTF? popup an error or something
      connect();
    }
  }

  // TODO: can you put this in a util lib and just pass the config vs having it here and bubbling it down 
  function jog(){
    var d = {cmd: "jog",config: config}
    console.log("ws",config,ws);
    ws.send(JSON.stringify(d));
  }

  function jogAbs(pos){
    console.log("jogAbs pos",pos)
    var d = {cmd: "jogAbs",config: config}
    d.config.ja = pos;
    console.log("ws",d,config,ws);
    ws.send(JSON.stringify(d));
  }
 
  function connect(){
        ws = new WebSocket(addr);
        var connectInterval;

        // websocket onopen event listener
        ws.onopen = () => {
            console.log("connected websocket main component");

            setConnected(true);

            setTimeout(500); // reset timer to 250 on open of websocket connection 
            clearTimeout(connectInterval); // clear Interval on on open of websocket connection
            fetch();
        };

        // websocket onclose event listener
        ws.onclose = e => {
            setConnected(false);
            console.log(
                `Socket is closed. Reconnect will be attempted`,
                e.reason
            );

            connectInterval = setTimeout(check, Math.min(10000, timeout)); //call check function after timeout
        };

        // websocket onerror event listener
        ws.onerror = err => {
            console.error(
                "Socket encountered error: ",
                err.message,
                "Closing socket"
            );

            ws.close();
            setConnected(false);
            return false;
        };
        ws.onmessage = (message) => {
          //console.log("raw",message,message.origin);
          setOrigin(message.origin);
          
          //console.log(message.data instanceof Blob);
          if(message.data instanceof Blob){
            // TODO: double check all msgs are using msgpack here and in firmware
            decodeFromBlob(message.data).then((x) => {
              //console.log("got blob",x);
              
              if("t" in x){
                if(x["t"] == "status"){
                  setNewstats(!newstats);
                  setStats(x);
                  setDRO(x.pmm);
                  setRPM(x.rpm);
                  }
                else if(x["t"] == "nvConfig"){
                  console.log("got nv configuration",x);
                  setNvConfig(x);
                  }
                else if(x["t"] == "state"){
                  console.log("updating config",x);
                  setConfig(x);
                  handleView(x["m"]);
                }
                else if(x["t"] == "log"){
                  console.log("stuff",x); 
                  if(x["level"] == 0){
                    setModalErrorMsg(x["msg"]);
                    setShowModalError(true);
                    }
                  }
                }
              }

            );
          }
          else{
            console.log("this should not happen anymore");
            var inconfig = JSON.parse(message.data);
         
            console.log("got message", inconfig);
          }
          
          return false;
        }
    };
    
  function ping(){
    console.log("sending: ")
    var d = {cmd: "ping",runs: {}};
    ws.send(JSON.stringify(d));
  }
  
   
  function check(){
        if (!ws || ws.readyState === WebSocket.CLOSED) connect(); //check if websocket instance is closed, if so call `connect` function.
    };


    // TODO: refactor this mess 
  return(
    <div>
      <div className="card-title">
          <span className="btn-group">
          <span>
           <ModeSel handleModeSelect={handleModeSelect} modes={modes} config={config}></ModeSel> 
          </span>
          <span style={{ marginLeft: 5}}>
            {
              connected ?
                  <span className="badge bg-success">C</span>
                : <span className="badge bg-danger">Not Connected</span>
            }
          </span>
          <span>
            DRO: <span className="badge bg-warning">{dro.toFixed(4)}</span>
            RPM: <span className="badge bg-info">{rpm.toFixed(4)}</span>
            <Rev config={config} me={me} ws={ws} stats={stats} />
          </span>
          </span>
 
      </div>
  
    <Tabs defaultActiveKey="home" id="uncontrolled-tab-example" 
    onSelect={handleJogTabSelect}
    transition={false}>
    <Tab eventKey="home_tab" title="Home">
      <div> 
        Connection Status: {
          connected ? 
              <span className="badge bg-success">"True"</span>
            : <span className="badge bg-danger">"False"</span>
          }
      </div>
      <div>
        <span>
         Welcome!  Select a mode to get started.
         <ModeSel handleModeSelect={handleModeSelect} modes={modes} config={config}></ModeSel>
         </span>
      </div>
    </Tab>
    <Tab eventKey="jog2_tab" title="New Jog">
      <div>
        <div className="card-body">
            { config["m"] == 0 &&
            <div>

              Select a mode above
            </div>
            }
            { config["m"] != 0 && 
            <JogUI config={config} setConfig={setConfig} me={me} ws={ws} stats={stats} jogcancel={jogcancel} sendConfig={sendConfig}></JogUI>
            }
        </div>
      </div>
    </Tab>
    <Tab eventKey="jog_tab" title="Jog" >
    <div>
      <div className="card-body">
          { stats["pos_feed"] &&
            <Feeding stats={stats} jogcancel={jogcancel}></Feeding> 
          }
          
           { showJog && !stats["pos_feed"] && !stats["sw"] &&
            <div>
              <Form inline >
                <Form.Row>
                  <Col>
                      <Form.Check inline type="checkbox" label="Feed CCW" 
                        name="feeding_left" ref={register({required: false})} 
                        id="feeding_left"
                        checked={feedingLeft}
                        onChange ={ () => setFeedingLeft(!feedingLeft)} />
                  </Col>
                  <Col>
                      <Form.Check inline type="checkbox" label="Sync Start"
                        name="syncStart" ref={register({required: false})}
                        id="syncStart"
                        checked={syncStart}
                        onChange ={ () => setSyncStart(!syncStart)} />
                  </Col>
                  
                </Form.Row>
              </Form>
              <Form inline onSubmit={handleSubmit(onSubmitJog)} onKeyPress={(e) => { e.key === 'Enter' && e.preventDefault(); }} >
                <Form.Row>
                <span>Incremental</span>
                <InputGroup className="mb-2 mr-sm-2">

                <Col xs={2}>
                <Button type="submit" className="mb-2 mr-sm-2" 
                  disabled={stats.pos_feed}
                  onClick={() => setSubmitButton(-1)}>
                  Jog Z- 
                </Button>
                </Col>
                <Col xs={8}>
                <InputGroup.Prepend className="inputGroup-sizing-xs">
                    <InputGroup.Text>Jog <br />mm:</InputGroup.Text>
                     <Form.Control id="jog_mm" name="jog_mm" type="number" 
                      ref={register({ required: true })}
                      inputMode='decimal' step='any' defaultValue={Math.abs(config.jm)} />
                
                  </InputGroup.Prepend>
                 </Col>

                  <Col xs={2}>
                  <Button type="submit" className="mb-2" 
                    disabled={stats.pos_feed}
                    onClick={() => setSubmitButton(1)}>
                    Jog Z+
                  </Button>
                  </Col>
                </InputGroup>
                </Form.Row>
              </Form>
              
 
                <h5> Absolute </h5>
               <Form inline onSubmit={handleSubmit(onSubmitAbsJog)} onKeyPress={(e) => { e.key === 'Enter' && e.preventDefault(); }} >
                <Col xs={8}>
                <InputGroup.Prepend className="inputGroup-sizing-sm">
                    <InputGroup.Text>Position(mm)</InputGroup.Text>
                     <Form.Control id="jog_abs_mm" name="jog_abs_mm" type="number"
                      ref={register({ required: true })}
                      inputMode='decimal' step='any' defaultValue={Math.abs(config.ja)} />

                  </InputGroup.Prepend>
                </Col>
                <Col>
                  <Button type="submit" className="mb-2"
                    disabled={stats.pos_feed}
                    onClick={() => setSubmitButton(2)}>
                    Go
                  </Button>
                </Col>
              </Form>
            </div>
           }
      </div>
      <div className="card-body">
                <Form inline onSubmit={handleSubmit(onSubmitPitch)} >
                <Form.Row>
                <InputGroup className="mb-2 mr-sm-2">
                  <Col xs={8}>
                  <InputGroup.Prepend>
                    <InputGroup.Text>Pitch: {config["pitch"]}</InputGroup.Text>
                     <Form.Control id="pitch" name="pitch" type="number"
                      ref={register({ required: true })}
                      defaultValue="0.1"
                      inputMode='decimal' step='any' placeholder="1.0" />
                  </InputGroup.Prepend>
                  </Col>

                  <Col>
                  <Button type="submit" className="mb-2">
                    Change Pitch!
                  </Button>
                  </Col>
                </InputGroup>
                </Form.Row>
              </Form>
              
             { showRapid && 
              <div>
                <Form onSubmit={handleSubmit(onSubmitRapid)}>
                <div className="row row-cols-lg-auto g-3 align-items-center">
                  <div className="col-12">
                   <RangeSlider name="Rapid" defaultValue={config.rapid} register={register} /> 
                  </div>

                </div>
                </Form>
                </div>

              }
              { showRapid &&
              <div>
              <Form inline onSubmit={handleSubmit(onSubmitJogScaler)} >
                <InputGroup className="mb-2 mr-sm-2">
                  <InputGroup.Prepend>
                    <InputGroup.Text>Jog Scaler</InputGroup.Text>
                     <Form.Control id="sc" name="sc" type="number"
                      ref={register({ required: true })}
                      defaultValue="0.5"                                                                                                      
                      inputMode='decimal' step='any' placeholder="1.0" />
                  </InputGroup.Prepend>
                  <Button type="submit" className="mb-2">
                    Update Jog Scaler Hack!
                  </Button>
                </InputGroup>
              </Form>
              </div>
              }

              <span className="card-text">
                {config["m"] == 0 &&
                  <h4>
                  Select a mode to get started!
                  </h4>
                }

              </span>

            </div>
      <div>

      </div>
    </div>
    </Tab>
    <Tab eventKey="net_tab" title="Network">
      <label htmlFor="mdns">MDNS {cookie.url}</label>
      <form>
      <input className="form-control" type="text"
        name="mdns"
        onChange={handleAddrChange}
        value={addr} />
      </form>
      <div className="btn-group" role="group" >
        <div className="btn btn-primary" type="button" onClick={connect_click}>
          Connect
        </div>
        <div className="btn btn-secondary" type="button" onClick={disconnect}>
          Disconnect
        </div>
        <div className="btn btn-secondary" type="button" onClick={ping}>
          Ping
        </div>
        <div className="btn btn-secondary" type="button" onClick={fetch}>
          Fetch
        </div>
      </div>
      <br /> {origin}
    </Tab>
    <Tab eventKey="thread_tab" title="Thread">
                <ThreadView config={config} stats={stats} />
    </Tab>
    <Tab eventKey="config_tab" title="Conf">
      <div className="row">
      <div className="col-md-8">
        <div className="card">
          <div className="card-header">
            NV Config
          </div>
          <div className="card-body">
          <Form inline onSubmit={handleSubmit(onSubmitNvConfig)} >
                  <Form.Row>
                  <InputGroup className="mb-2 mr-sm-2">
                    <Col xs={8}>
                    <InputGroup.Prepend>
                      <InputGroup.Text>Lead Screw Pitch {nvConfig["lead_screw_pitch"]}</InputGroup.Text>
                      <Form.Control id="lead_screw_pitch" name="lead_screw_pitch" type="number"
                        ref={register({ required: true })}
                        defaultValue={nvConfig["lead_screw_pitch"]}
                        inputMode='decimal' step='any' placeholder={nvConfig["lead_screw_pitch"]} />
                        
                    </InputGroup.Prepend>
                    <InputGroup.Prepend>
                      <InputGroup.Text>Micro Steps {nvConfig["microsteps"]}</InputGroup.Text>
                      <button type="button" className="btn btn-secondary" data-toggle="tooltip" title="this is the microstepping mutliplier 1,2,4,8,16 etc">?</button>
                      <Form.Control id="microsteps" name="microsteps" type="number"
                        ref={register({ required: true })}
                        defaultValue={nvConfig["microsteps"]}
                        inputMode='decimal' step='any' placeholder={nvConfig["microsteps"]} />
                        
                    </InputGroup.Prepend>
                    <InputGroup.Prepend>
                      <InputGroup.Text>Spindle Encoder Resolution (CPR) {nvConfig["spindle_encoder_resolution"]}</InputGroup.Text>
                      <Form.Control id="spindle_encoder_resolution" name="spindle_encoder_resolution" type="number"
                        ref={register({ required: true })}
                        defaultValue={nvConfig["spindle_encoder_resolution"]}
                        inputMode='decimal' step='any' placeholder={nvConfig["spindle_encoder_resolution"]} />
                        
                    </InputGroup.Prepend>
                    </Col>

                    <Col>
                    <Button type="submit" className="mb-2">
                      Save Config! 
                    </Button>
                    </Col>
                  </InputGroup>
                  </Form.Row>
                </Form>
                <Form onSubmit={handleSubmit(handleResetNvConfig)}>
                <Button type="submit" className="mb-2">
                      Reset Config to defaults.
                    </Button>
                </Form>
          </div>
        </div>
      </div>
    </div>
    <div>
      - <Info stats={stats} x={newstats} config={config} nvConfig={nvConfig} /> -
      </div>
      
    </Tab>
    <Tab eventKey="hob_tab" title="Hobbing">
      <Hobbing config={config} setConfig={setConfig} me={me} ws={ws} stats={stats} jogcancel={jogcancel}></Hobbing>
    </Tab>
    <Tab eventKey="debug_tab" title="Debug">
      <Debug handleEncClick={handleEncClick} encSpeed={encSpeed} updateEncSpeed={updateEncSpeed}></Debug>




    </Tab>
    </Tabs>
    <ModalError showModalError={showModalError} 
        modalErrorMsg={modalErrorMsg} 
        setShowModalError={setShowModalError}
  
    />
    </div>
  )};
