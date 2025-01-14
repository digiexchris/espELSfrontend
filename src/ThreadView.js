//#use react and stuff
import React, { Component, useState, useEffect } from 'react';
import Button from 'react-bootstrap/Button';
import Badge from 'react-bootstrap/Badge'
import ListGroup from 'react-bootstrap/ListGroup';
import {Form, InputGroup,Col,Grid,Row} from 'react-bootstrap';
import FormControl from 'react-bootstrap/FormControl';
import Card from 'react-bootstrap/Card';
import {useForm} from 'react-hook-form';

var magic = true;



export default function ThreadView({config,stats}) {
  const { register, handleSubmit, watch, errors } = useForm();

  


  const passes = () => {
    let p = Math.ceil(Math.pow(((config.pitch * 0.614) / firstThreadDepth),2));
    if(Number.isInteger(p)){
      return p;  
    }else{ return 0}
  }

  /*const handleSubmit = () => {

  }
  */

  const onSubmitJog = (data) => {
    var c = config
    /*
    c.f = feedingLeft;
    c.s = syncStart;
    */
    if(submitButton == 1){
    }else if(submitButton == -1){
    }else if(submitButton == 3){
      // move Z- for thread offset
      // TODO: move this threading offset stuff to a new tab and make a component dedicated to threading
      setThreadOffset(config.pitch / passes());
      c.jm = (threadOffset * -1) ;
      //setConfig(c);
      //jog();
      console.log("MOVED TO ThreadView!!!!  Z- btn");
      
    }else if(submitButton == 4){
      // TODO: move this too
      c.jm = threadOffset;
      //setConfig(c);
      //jog();
      console.log("Z+ btn",config.pitch / passes());
      
    }
    console.log("onSubmitJog data",data,c,submitButton);
  }

  const onSubmitPitch = (data) => {
    var c = config
    c.pitch = data.pitch
    //setConfig(c);
    console.log("data",data);
    //sendConfig();
  }


  function makeThreadTable(rec_passes,first){
    var cards = [];
    var thread_depth = (config.pitch * 0.614);
    var t = first;
    var feed = 0;
    for (var i = 1; i <= (rec_passes); i++){
        if(i == 1){
          feed = first;
        }else{
          feed = (thread_depth/Math.sqrt(rec_passes-1)) * Math.sqrt(i-1);
        }
        cards.push(<ListGroup.Item key={i}>
                      pass: {i} _
                      offset = { (config.pitch / passes())*i} _
                      Incremental Feed = 
                      <span> {feed - t} <b> Total Feed: {feed} </b>
                      </span>
                    </ListGroup.Item>)
        t = feed;
    } 
    return <div>{cards}</div>
  }

  const [firstThreadDepth, setFirstThreadDepth] = useState(0.2);
  const [threadOffset, setThreadOffset] = useState(0.0);
  const [submitButton,setSubmitButton] = useState(1);

  return (
<div className="container-fluid">
    Likely doesn't work anymore, needs refactoring <br />
    TODO: add field for setFirstTHreadDepth as this drives how many passes there are
    

    <h5> Offset </h5>
               <Form inline onSubmit={handleSubmit(onSubmitJog)} onKeyPress={(e) => { e.key === 'Enter' && e.preventDefault(); }} >
                <Col xs={8}>
                <InputGroup.Prepend className="inputGroup-sizing-sm">
                    <InputGroup.Text>Threading First Depth (drives passes calculation)</InputGroup.Text>
                     <Form.Control id="thread_depth" name="thread_depth" type="number"
                      ref={register({ required: true })}
                      inputMode='decimal' step='any' defaultValue={ firstThreadDepth} />
                </InputGroup.Prepend>
                <InputGroup.Prepend className="inputGroup-sizing-sm">
                    <InputGroup.Text>Threading Passes</InputGroup.Text>
                     <Form.Control id="thread_offset_mm" name="thread_offset_mm" type="number"
                      ref={register({ required: true })}
                      inputMode='decimal' step='any' defaultValue={ passes()} />

                 </InputGroup.Prepend>
                   "offset per pass" { config.pitch / passes() }
                  
                </Col>
                </Form>
                <Form inline onSubmit={handleSubmit(onSubmitJog)} onKeyPress={(e) => { e.key === 'Enter' && e.preventDefault(); }} >
                <Col>
                  <Button type="submit" className="mb-2"
                    disabled={stats.pos_feed}
                    onClick={() => setSubmitButton(3)}>
                    Move Offset Z-
                  </Button>
                  <Button type="submit" className="mb-2"
                    disabled={stats.pos_feed}
                    onClick={() => setSubmitButton(4)}>
                    Move Offset Z+
                  </Button>
                </Col>
                </Form>

                <div>
                Thread Depth: { config.pitch * 0.614 } Recommended Passes: { passes()}
                  Initial Offset: {firstThreadDepth} Offset per pass {config.pitch / passes()}
                <Card style={{ width: '18rem' }}>
                  <ListGroup variant="flush">
                    {
                      makeThreadTable(passes(),firstThreadDepth)
                    }
                  </ListGroup>
                </Card>
                <Form inline onSubmit={handleSubmit(onSubmitPitch)} >
                <Form.Row>
                <InputGroup className="mb-2 mr-sm-2">
                  <Col xs={8}>
                  <InputGroup.Prepend>
                    <InputGroup.Text>Pitch: {config["pitch"]}</InputGroup.Text>
                     <Form.Control id="pitch" name="pitch" type="number"
                      ref={register({ required: true })}
                      defaultValue="0.1"
                      inputMode='decimal' step='any' placeholder="{config.pitch}" />
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
                
                
              </div>
              <div>
              <div>raw config<pre>{JSON.stringify(config, null, 2) }</pre></div>
              </div>
</div>
)
}
