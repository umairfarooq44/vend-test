import React from 'react';
import Enzyme, {shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
import Modal from './Modal'

Enzyme.configure({adapter: new Adapter()});
it('should work fine', () => {
  const wrapper = shallow(<Modal />);
  expect(wrapper).toMatchSnapshot();
});

it('should have heading from default props', () => {
  const wrapper = shallow(<Modal />);
  expect(wrapper.find('h5').text()).toEqual('Are you sure?')
});

it('should have heading from props', () => {
  const wrapper = shallow(<Modal heading="my heading" />);
  expect(wrapper.find('h5').text()).toEqual('my heading')
});

it('should show loading ', () => {
  const wrapper = shallow(<Modal footerOkLoading={true} />);
  expect(wrapper.find('span')).toHaveLength(1)
});
it('should not show loading', () => {
  const wrapper = shallow(<Modal />);
  expect(wrapper.find('span')).toHaveLength(0);
});
it('should show cancel button text', () => {
  const wrapper = shallow(<Modal footerCancel="cancel" />);
  expect(wrapper.find('button').first().text()).toEqual('cancel');
});
it('should show ok button text', () => {
  const wrapper = shallow(<Modal footerOk="ok" />);
  expect(wrapper.find('button').last().text()).toEqual('ok');
});