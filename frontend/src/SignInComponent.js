/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */
import * as React from "react";
import Input from "@cloudscape-design/components/input";
import Button from "@cloudscape-design/components/button";
import Form from "@cloudscape-design/components/form";
import Container from "@cloudscape-design/components/container";
import SpaceBetween from "@cloudscape-design/components/space-between";
import FormField from "@cloudscape-design/components/form-field";
import { AuthenticationDetails, CognitoUserPool, CognitoUser } from 'amazon-cognito-identity-js';
import Flashbar from "@cloudscape-design/components/flashbar";
import Modal from "@cloudscape-design/components/modal";
import Box from "@cloudscape-design/components/box";
import { Headers } from 'node-fetch'; 
import config from './config.json';

const SignInComponent = () => {
    const [username, setUsername] = React.useState();
    const [password, setPassword] = React.useState();
    const [userLoggedIn, setUserLoggedIn] = React.useState(false);
    const [firstname, setFirstname] = React.useState();
    const [lastname, setLastname] = React.useState();
    const [loggedinuser, setLoggedInUser] = React.useState(null);
    const [idToken, setIdToken] = React.useState();
    const [items, setItems] = React.useState([]); 
    const [errors, setErrors] = React.useState([]);   
    const [visible, setVisible] = React.useState(false);
    const [apiresponse, setApiResponse] = React.useState("");

    function signIn() {
        // Clear flashbar error items
        setErrors([]);
        //Clear flashbar success items
        setItems([]);

        let authenticationData = {
            Username: username,
            Password: password
          };
      
          let authenticationDetails = new AuthenticationDetails(
            authenticationData
          );

          let poolData = { UserPoolId : config.userPoolId,
            ClientId :  config.clientId
          };
          let userPool = new CognitoUserPool(poolData);
      
          let userData = {
            Username: username,
            Pool: userPool,
          };

          console.log("--------Authenticate --- "+username+", UserPool:"+userPool);
      
          let cognitoUser = new CognitoUser(userData);

          cognitoUser.authenticateUser(authenticationDetails, {
            onSuccess: function(result) {
              let idToken = result.getIdToken().getJwtToken();
              let accessToken = result.getAccessToken().getJwtToken();
              setIdToken(idToken);

              console.log("idToken:"+idToken);
              console.log("AccessToken:"+accessToken);
              setUserLoggedIn(true); 
              setLoggedInUser(cognitoUser)
              setItems([
                {
                  type: "success",
                  content: "User [" + username + "] logged in!",
                  dismissible: true,
                  dismissLabel: "Dismiss message",
                  onDismiss: () => setItems([]),
                  id: "message_1"
                }
              ])            
            },
      
            onFailure: function(err) {
              console.log(err.message || JSON.stringify(err));
              setErrors([{
                header: "User [ " +  username + " ] login failed!",
                type: "error",
                content: "Reason:" + err.message || JSON.stringify(err),
                dismissible: true,
                dismissLabel: "Dismiss message",
                onDismiss: () => setErrors([]),
                id: "message_1"
              }]);
            },
      
          });
    }

    function signOut() {
      console.log(loggedinuser);
      loggedinuser.signOut();
      setUserLoggedIn(false);
      setIdToken(null);
      setItems([])
      setErrors([])
    }

    function callApi() {
        setItems([]);
        // instantiate a headers object
        var myHeaders = new Headers();

        // add content type header to object
        myHeaders.append("Content-Type", "application/json");
        myHeaders.append("Authorization", idToken);

        // using built in JSON utility package turn object to string and store in a variable
        var raw = JSON.stringify({"firstName":firstname,"lastName":lastname});
        // create a JSON object with parameters for API call and store in a variable
        var requestOptions = {
            method: 'POST',
            headers: myHeaders,
            body: raw,
            redirect: 'follow'
        };
        // make API call with parameters and use promises to get response
        fetch(config.apiUrl, requestOptions)        
        .then(response => response.json())
        .then(data => { 
          console.log(data);
          setApiResponse(data);
          setVisible(true)
        })
        .catch(error => console.log('error', error));
    }

    return (
    <>
    <SpaceBetween direction="vertical" size="l">
    <form onSubmit={e => e.preventDefault()}>
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" 
                onClick= { async () => { await signIn() } }
                disabled={userLoggedIn}
            >
              Sign In
            </Button>
            <Button onClick= { async () => { await signOut() } } disabled={!userLoggedIn} >Sign Out</Button>
          </SpaceBetween>
        }
      >
      <Container
      >
        <SpaceBetween direction="vertical" size="l">
          <Flashbar items={errors} />
          <FormField label="Username">
          <Input
              onChange={({ detail }) => setUsername(detail.value)}
              value={username} 
              placeholder="Enter email"
          />
          </FormField>
          <FormField label="Password">
          <Input
              onChange={({ detail }) => setPassword(detail.value)}
              value={password}
              type="password"
          />
          </FormField>
        </SpaceBetween>
      </Container>
      </Form>
    </form>   
    { userLoggedIn ?     
    <form onSubmit={e => e.preventDefault()}> 
      <Form
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" 
                onClick= { async () => { await callApi() } }
            >
              Call API
            </Button>
          </SpaceBetween>
        }
      >
      <Container
      >
        <SpaceBetween direction="vertical" size="l">
          <Flashbar items={items} />
          <FormField label="First Name">
          <Input
              onChange={({ detail }) => setFirstname(detail.value)}
              value={firstname}
              placeholder="Enter first name"
          />
          </FormField>
          <FormField label="Last Name">
          <Input
              onChange={({ detail }) => setLastname(detail.value)}
              value={lastname}             
              placeholder="Enter last name"
          />
          </FormField>
        </SpaceBetween>
      </Container>
      </Form>
    </form> : ''
    }
    </SpaceBetween>
    <Modal
      onDismiss={() => setVisible(false)}
      visible={visible}
      closeAriaLabel="Close modal"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="primary" onClick= { () => { setVisible(false) } }>Ok</Button>
          </SpaceBetween>
        </Box>
      }
      header="Response from API"
    >
      {apiresponse}
    </Modal>
    </>
      );
}

export default SignInComponent