import React, {useState} from 'react';
import {BrowserRouter as Router} from 'react-router-dom';
import 'antd/dist/antd.css'
import {Form, Input, Button} from 'antd';
import Title from "antd/lib/typography/Title";
import {CheckOutlined} from '@ant-design/icons';


const CheckOut = ({cart}) => {
    console.log(cart)
    const [form] = Form.useForm();
    const totalPrice = cart.map(item => item.product.price * item.quantity).reduce((acc, val) => acc + val, 0)

    const onFieldsChanged = values => {
        //when price is the total calc'
        fetch(`http://localhost:3001/checkout/${totalPrice}`, {
            method: 'POST', // or 'PUT'
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                firstName: values.firstName,
                lastName: values.lastName,
                phoneNum: values.phoneNum,
                country: values.country,
                address: values.address,
                zipCode: values.zipCode,
            }),
        })
            .then(() => window.location.href='/')
            .catch(error => {
                console.error('Error:', error);
            });
    };

    return (
        <Router>
            <div className="log">
                <header><Title style={{color: 'BLACK'}} level={2}>Check Out, Total Of {totalPrice}$</Title>
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={onFieldsChanged}
                        requiredMark={false}
                    >

                        <Form.Item label="First Name" name="firstName" rules={[
                            {
                                required: true,
                                message: 'Please input your First Name!',
                            }, {
                                message: 'Not Vaild First Name',
                                pattern: /^[a-zA-Z]+[/s]*[a-zA-Z]+$/
                            }
                        ]}
                        >
                            <Input type="text" id="firstName" style={{}} placeholder=""/>
                        </Form.Item>
                        <Form.Item label="Last Name" name="lastName" rules={[
                            {
                                required: true,
                                message: 'Please input your Last Name!',
                            }, {
                                message: 'Not Vaild Last Name',
                                pattern: /^[a-zA-Z]+[/s]*[a-zA-Z]+$/
                            }
                        ]}
                        >
                            <Input type="text" id="lastName" style={{}} placeholder=""/>
                        </Form.Item>
                        <Form.Item label="Phone Number" name="phoneNum" rules={[
                            {
                                required: true,
                                message: 'Please input your Phone Number!',
                            }, {
                                message: 'Not Vaild Phone Number',
                                pattern: /(^([0-9])+(-)+([0-9])+$)|((^([0-9])+)+)/
                            }, {
                                min: 9,
                                message: 'Phone Number cannot be less than 9 characters',
                            },
                        ]}
                        >
                            <Input type="text" id="phoneNum" style={{}} placeholder=""/>
                        </Form.Item>

                        <h4>Address Details:</h4>
                        <Form.Item label="Country" name="country" id="country" rules={[
                            {
                                required: true,
                                message: 'Please input Country!',
                            }, {
                                message: 'Not Vaild Country',
                                pattern: /^[a-zA-Z]+[/s]*[a-zA-Z]+$/
                            }
                        ]}
                        >
                            <Input type="text" style={{}} placeholder=""/>
                        </Form.Item>

                        <Form.Item label="Address" name="address" rules={[
                            {
                                required: true,
                                message: 'Please input Address!',
                            },
                        ]}
                        >
                            <Input type="text" style={{}} placeholder=""/>
                        </Form.Item>

                        <Form.Item label="zip code" name="zipCode" rules={[
                            {
                                required: true,
                                message: 'Please input your Zip Code!',
                            }, {
                                message: 'Not Vaild Zip Code',
                                pattern: /(^([0-9])+(-)+([0-9])+)|((^([0-9])+)+)/
                            }, {
                                min: 6,
                            },
                        ]}
                        >
                            <Input type="text" style={{}} placeholder=""/>
                        </Form.Item>

                        <Form.Item>
                            <Button type="primary" htmlType="submit">Place Order<CheckOutlined/></Button>
                        </Form.Item>
                    </Form>
                </header>
            </div>
        </Router>
    );
};
export default CheckOut;