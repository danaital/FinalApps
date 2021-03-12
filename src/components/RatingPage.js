import React, {useState} from 'react';
import 'antd/dist/antd.css'
import {Layout, Menu, Breadcrumb, Button, PageHeader, Input, AutoComplete, Rate, Row, Col, Table} from 'antd';
import { BrowserRouter as Router } from 'react-router-dom';
import Title from "antd/lib/typography/Title";
const { Content } = Layout;

function RatingPage(props) {
    const [rating, setRating] = useState(0);
    const onclick =  () =>{
        fetch(`http://localhost:3001/products/${props.match.params.productID}/rating/${rating}`,
            {
                method: 'POST', // or 'PUT'
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(),
            })
            .then(response => response.json())
            .then(data => {
                console.log('Success:',data);
                window.location.href = '/';
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };


    return (
        <Router>
        <div style={{background:'lightgrey', marginTop: '100px'}}>
            <Layout>
                <Content className='site-layout-background'>
                    <header> <Title style={{color: 'BLACK',  position: 'fixed',
                        marginLeft: '525px',
                        marginRight: '450px',
                        marginTop: '60px'
                    }} level={2}>Rate {props.match.params.productName} Product!</Title>
                    </header>
                    <br></br>

                </Content>
            </Layout>
            <Rate style={{marginTop: '150px', marginLeft: '400px', marginRight: '400px', }} onChange={rate => setRating(rate)}>
            </ Rate>
            <br></br>
            <br></br>
            <br></br>
            <Button type="primary" style={{marginTop:'100px', marginLeft: '310px',
                marginRight: '300px'}} onClick={onclick}>Add your rating!</Button>

        </div>
        </Router>

    );
};

export default RatingPage;