import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import 'antd/dist/antd.css'
import { Form, Input, Button} from 'antd';
import Title from "antd/lib/typography/Title";


const Registration = (props) => {
    const [form] = Form.useForm();


    const onFieldsChanged = () => {
        fetch('http://localhost:3001/register', {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: document.getElementById("email").value,
                password: document.getElementById("password").value,
                remail: document.getElementById("remail").value,
                rpassword: document.getElementById("rpassword").value,
                name: document.getElementById("name").value
            }),
        })
            .then(response => response.json()).catch((error) => {
            console.error('Error:', error);
        });
    };



    return (

        <Router>
        <div className="log">
            <header> <Title style={{color: 'BLACK'}} level={2}>Create your Flint account</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFieldsChanged}
                    requiredMark={false}
                >

                    <Form.Item label="Name" name="name" rules={[
                        {
                            required: true,
                            message: 'Please input your name!',
                        },{
                            message:'Not Vaild Name',
                            pattern: /^[a-zA-Z]+[/s]*[a-zA-Z]+$/
                        }
                    ]}
                    >
                        <Input type="text" name="name" id="name" style={{}} placeholder="" />
                    </Form.Item>

                    <Form.Item label="Email" name="email" rules={[
                        {
                            required: true,
                            message: 'Please input your email!',
                        },{
                            message:'Not vaild Email'
                            ,
                            pattern:/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
                        }
                    ]}>
                        <Input type="email" id="email" style={{}} placeholder="" />
                    </Form.Item>

                    <Form.Item label="Re-Email" required name="remail"  rules={[
                        {
                            required: true,
                            message: 'Please confirm your email!',
                        },
                        ({ getFieldValue }) => ({
                            validator(rule, value) {
                                if (!value || getFieldValue('email') === value) {
                                    return Promise.resolve();
                                }

                                return Promise.reject('The two emails that you entered do not match!');
                            },
                        }),
                    ]}>
                        <Input type="email" id="remail" style={{}} placeholder="" />
                    </Form.Item>

                    <Form.Item label="Password" name="password" rules={[
                        {
                            required: true,
                            message: 'Please input your password!',
                        }, {
                            min:6,
                            message: 'Password cannot be less than 6 characters',
                        }, {
                            max:12,
                            message: 'Password cannot be greater than 12 characters',
                        },{
                            message:'Password must include at least:'+
                                '1 Small Letter' +
                                '1 Capitel Letter'+
                                '1 Number'
                                ,
                            pattern: /((^([0-9])+([A-Z])+([a-z])+$))|((^([0-9])+([a-z])+([A-Z])+)$)|((^([A-Z])+([0-9])+([a-z])+)$)|((^([A-z])+([a-z])+([0-9])+)$)|((^([a-z])+([0-9])+([a-z])+)$)|((^([a-z])+([A-Z])+([0-9])+)$)/
                        }

                    ]}>
                        <Input type="password" id="password" placeholder="" />
                    </Form.Item>

                    <Form.Item label="Re-Password" required name="repassword" rules={[
                        {
                            required: true,
                            message: 'Please confirm your password!',
                        },
                        ({ getFieldValue }) => ({
                            validator(rule, value) {
                                if ((!value || getFieldValue('password')) === value ) {
                                    return Promise.resolve();
                                }

                                return Promise.reject('The two passwords that you entered do not match!');
                            },
                        }),
                    ]}>
                            <Input type="password" id="rpassword" placeholder="" />

                    </Form.Item>

                    <Form.Item>
                        <Button type="primary" htmlType="submit">Registration</Button>
                    </Form.Item>
                </Form>
            </header>
        </div>
        </Router>
    );
};
export default Registration;
