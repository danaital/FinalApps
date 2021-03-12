import React from 'react';
import 'antd/dist/antd.css'
import { Form, Input, Button, Select} from 'antd';
import Title from "antd/lib/typography/Title";


const EditProduct = (props) => {
    const [form] = Form.useForm();

    const onFinish = values => {
        console.log(values)
        fetch(`http://localhost:3001/admin/editproduct`,
            {
                method: 'POST', // or 'PUT'
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    field: values.field,
                    newValue: values.value,
                    productID: props.match.params.productID

                    }),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:',data );
                window.location.href = '/';
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    }

    return (

        <div className="log">
            <header> <Title style={{color: 'BLACK'}} level={2}>Edit Product</Title>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    requiredMark={false}
                >

                    <Form.Item label="Field" name="field">
                        <Select defaultValue="name">
                            <Select.Option value="name">Name</Select.Option>
                            <Select.Option value="description">Description</Select.Option>
                            <Select.Option value="price" >Price</Select.Option>
                        </Select>
                    </Form.Item>

                    <Form.Item label="Value" rules={[
                        {
                            required: true,
                            message: 'Please Choose new value',
                        }
                    ]} name={"value"}>
                        <Input type="text"/>
                    </Form.Item>
                    <Form.Item>
                        <Button type="primary" htmlType="submit">Edit</Button>
                    </Form.Item>
                </Form>
            </header>
        </div>
    );
};
export default EditProduct;