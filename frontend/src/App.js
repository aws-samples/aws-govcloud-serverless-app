/*! Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *  SPDX-License-Identifier: MIT-0
 */

import "@cloudscape-design/global-styles/index.css"

import Tabs from "@cloudscape-design/components/tabs";
import React from 'react';
import SignInComponent from './SignInComponent'
import SignUpComponent from './SignUpComponent'

function App() {

  return (
    <Tabs
    tabs={[
      {
        label: "Sign-up",
        id: "first",
        content: <SignUpComponent/>
      },
      {
        label: "Sign-in",
        id: "second",
        content: <SignInComponent/>
      }
    ]}
  />
  );
}

export default App;
