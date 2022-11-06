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
import { CognitoUserPool, CognitoUserAttribute } from 'amazon-cognito-identity-js';
import config from './config.json';
import Flashbar from "@cloudscape-design/components/flashbar";

const SignUpComponent = () => {
    const [email, setEmail] = React.useState();
    const [password, setPassword] = React.useState();
    const [items, setItems] = React.useState([]);
    const [error, setError] = React.useState([]);

    function signUp() {
          // Clear flashbar error items
          setError([]);
          var poolData = { UserPoolId : config.userPoolId,
            ClientId : config.clientId
          };
          var userPool = new CognitoUserPool(poolData);
          
          var dataEmail = { Name: 'email', Value: email };
      
          var attributeEmail = new CognitoUserAttribute(dataEmail);
      
          var attributeList = [];
          attributeList.push(attributeEmail);
      
          userPool.signUp(email, password, attributeList, null, function(err, result ) {
            if (err) {
              console.log(err.message || JSON.stringify(err));
              setError([{
                header: "Failed to sign up user",
                type: "error",
                content: err.message || JSON.stringify(err),
                dismissible: true,
                dismissLabel: "Dismiss message",
                onDismiss: () => setError([]),
                id: "message_1"
              }]);
              return;
            } else {
              console.log("Success:"+result);
      
              var cognitoUser = result.user;
              var confirmationCode = prompt("Please enter confirmation code:");
      
              cognitoUser.confirmRegistration(confirmationCode, true, function(err, result) {
                if (err) {
                  alert(err.message || JSON.stringify(err));
                  setError([{
                    header: "Failed to confirm registration for user:[" + email + "]. Please contact your system administrator",
                    type: "error",
                    content: err.message || JSON.stringify(err),
                    dismissible: true,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setError([]),
                    id: "message_1"
                  }]);
                  return;
                }
                console.log('call result: ' + result);
                setItems([
                  {
                    type: "success",
                    content: "User: " + email + " signed up and registered successfully!",
                    dismissible: true,
                    dismissLabel: "Dismiss message",
                    onDismiss: () => setItems([]),
                    id: "message_2"
                  }
                  ]);
              });
            }
          });
    }

    return (
    <form onSubmit={e => e.preventDefault()}>
      <Form
        actions={
             <Button variant="primary" 
                onClick= { async () => { await signUp() } }
            >Sign Up</Button>            
        }
      >
        <Container
        >
          <SpaceBetween direction="vertical" size="l">
            <Flashbar items={items} />
            <Flashbar items={error} />
            <FormField label="Username">
            <Input
                onChange={({ detail }) => setEmail(detail.value)}
                value={email} type="email"
                inputMode="email"
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
      );
}

export default SignUpComponent